import html2canvas from 'html2canvas';

// Conversor de OKLCH a RGB/RGBA robusto para evitar fallos de html2canvas
export function oklchToRgb(oklchStr: string): string {
  try {
    const cleanStr = oklchStr.trim().toLowerCase();
    const match = cleanStr.match(/oklch\(([^)]+)\)/);
    if (!match) return oklchStr;
    
    const content = match[1].trim();
    // Soporta espacio, coma o barra inclinada '/'
    const parts = content.split(/[\s,#/]+/).filter(Boolean);
    if (parts.length < 3) return oklchStr;
    
    let L = parseFloat(parts[0]);
    if (parts[0].endsWith('%')) L = L / 100;
    
    let C = parseFloat(parts[1]);
    if (parts[1].endsWith('%')) C = C / 100;
    
    let H = parseFloat(parts[2]);
    if (parts[2].endsWith('deg')) H = parseFloat(parts[2].slice(0, -3));
    else if (parts[2].endsWith('rad')) H = parseFloat(parts[2].slice(0, -3)) * (180 / Math.PI);
    else if (parts[2].endsWith('turn')) H = parseFloat(parts[2].slice(0, -4)) * 360;
    
    let A = 1;
    if (parts.length >= 4) {
      const alphaPart = parts[3];
      A = parseFloat(alphaPart);
      if (alphaPart.endsWith('%')) {
        A = A / 100;
      }
    }
    
    // Convertir Hue a radianes
    const hRad = (H * Math.PI) / 180;
    const a = C * Math.cos(hRad);
    const b = C * Math.sin(hRad);
    
    // OKLCH -> Oklab -> XYZ (sRGB de referencia)
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    
    const l = Math.pow(Math.max(0, l_), 3);
    const m = Math.pow(Math.max(0, m_), 3);
    const s = Math.pow(Math.max(0, s_), 3);
    
    // XYZ -> Linear sRGB
    const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const b_rgb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
    
    // Corrección gamma
    const gamma = (c: number) => {
      return c >= 0.0031308 ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055 : 12.92 * c;
    };
    
    const R = Math.round(Math.max(0, Math.min(1, gamma(r))) * 255);
    const G = Math.round(Math.max(0, Math.min(1, gamma(g))) * 255);
    const B = Math.round(Math.max(0, Math.min(1, gamma(b_rgb))) * 255);
    
    if (A === 1) {
      return `rgb(${R}, ${G}, ${B})`;
    } else {
      return `rgba(${R}, ${G}, ${B}, ${A})`;
    }
  } catch (err) {
    console.warn("Error convirtiendo OKLCH:", oklchStr, err);
    return oklchStr;
  }
}

// Wrapper seguro de html2canvas que parchea OKLCH en tiempo de ejecución para evitar excepciones
export async function safeHtml2canvas(element: HTMLElement, options: any = {}): Promise<HTMLCanvasElement> {
  const originalGetComputedStyle = window.getComputedStyle;
  const originalGetPropertyValue = CSSStyleDeclaration.prototype.getPropertyValue;
  const originalCssRulesDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'cssRules');
  const originalCssRulesGet = originalCssRulesDescriptor?.get;

  // 1. Parchear getComputedStyle de forma segura con un Proxy delegado al target para evitar "Illegal invocation"
  window.getComputedStyle = function(elt: Element, pseudoElt?: string | null): CSSStyleDeclaration {
    const style = originalGetComputedStyle(elt, pseudoElt);
    return new Proxy(style, {
      get(target, prop) {
        let value;
        try {
          value = Reflect.get(target, prop, target);
        } catch {
          value = (target as any)[prop];
        }
        
        if (typeof value === 'string' && value.includes('oklch(')) {
          return value.replace(/oklch\([^)]+\)/g, (match) => oklchToRgb(match));
        }
        if (typeof value === 'function') {
          return value.bind(target);
        }
        return value;
      }
    });
  };

  // 2. Parchear CSSStyleDeclaration.prototype.getPropertyValue
  CSSStyleDeclaration.prototype.getPropertyValue = function(this: CSSStyleDeclaration, property: string): string {
    const value = originalGetPropertyValue.call(this, property);
    if (typeof value === 'string' && value.includes('oklch(')) {
      return value.replace(/oklch\([^)]+\)/g, (match) => oklchToRgb(match));
    }
    return value;
  };

  // 3. Parchear CSSStyleSheet.prototype.cssRules en el prototipo para filtrar oklch de las reglas CSS leídas por html2canvas
  if (originalCssRulesGet) {
    try {
      Object.defineProperty(CSSStyleSheet.prototype, 'cssRules', {
        get(this: CSSStyleSheet) {
          let rules;
          try {
            rules = originalCssRulesGet.call(this);
          } catch {
            return null; // Ignorar SecurityError en hojas CORS
          }
          if (!rules) return rules;
          return new Proxy(rules, {
            get(target, prop) {
              let value;
              try {
                value = Reflect.get(target, prop, target);
              } catch {
                value = (target as any)[prop];
              }
              
              if (typeof prop === 'string' && !isNaN(Number(prop)) && value) {
                return new Proxy(value, {
                  get(ruleTarget, ruleProp) {
                    let ruleVal;
                    try {
                      ruleVal = Reflect.get(ruleTarget, ruleProp, ruleTarget);
                    } catch {
                      ruleVal = (ruleTarget as any)[ruleProp];
                    }
                    if (ruleProp === 'cssText' && typeof ruleVal === 'string' && ruleVal.includes('oklch(')) {
                      return ruleVal.replace(/oklch\([^)]+\)/g, (match) => oklchToRgb(match));
                    }
                    if (typeof ruleVal === 'function') {
                      return ruleVal.bind(ruleTarget);
                    }
                    return ruleVal;
                  }
                });
              }
              if (typeof value === 'function') {
                return value.bind(target);
              }
              return value;
            }
          });
        },
        configurable: true,
        enumerable: true
      });
    } catch (e) {
      console.warn("No se pudo iniciar parche de cssRules en prototipo:", e);
    }
  }

  try {
    // Ejecutar el html2canvas original
    return await html2canvas(element, options);
  } finally {
    // Restaurar parches originales
    window.getComputedStyle = originalGetComputedStyle;
    CSSStyleDeclaration.prototype.getPropertyValue = originalGetPropertyValue;
    if (originalCssRulesDescriptor) {
      try {
        Object.defineProperty(CSSStyleSheet.prototype, 'cssRules', originalCssRulesDescriptor);
      } catch (e) {
        console.warn("No se pudo restaurar cssRules original en prototipo:", e);
      }
    }
  }
}
