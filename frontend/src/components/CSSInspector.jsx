import { useState, useEffect, useCallback } from 'react';
import './CSSInspector.css';

function CSSInspector({ isActive, onToggle }) {
  const [hoveredElement, setHoveredElement] = useState(null);
  const [elementStyles, setElementStyles] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const getComputedStyles = useCallback((element) => {
    if (!element) return null;

    const computed = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return {
      // Размеры
      width: rect.width.toFixed(2) + 'px',
      height: rect.height.toFixed(2) + 'px',
      
      // Цвета
      backgroundColor: computed.backgroundColor,
      color: computed.color,
      borderColor: computed.borderColor,
      
      // Display & Layout
      display: computed.display,
      position: computed.position,
      
      // Flexbox
      flexDirection: computed.flexDirection !== 'row' ? computed.flexDirection : null,
      justifyContent: computed.justifyContent !== 'normal' ? computed.justifyContent : null,
      alignItems: computed.alignItems !== 'normal' ? computed.alignItems : null,
      gap: computed.gap !== '0px' ? computed.gap : null,
      
      // Grid
      gridTemplateColumns: computed.gridTemplateColumns !== 'none' ? computed.gridTemplateColumns : null,
      gridTemplateRows: computed.gridTemplateRows !== 'none' ? computed.gridTemplateRows : null,
      gridGap: computed.gridGap !== '0px 0px' ? computed.gridGap : null,
      
      // Padding
      padding: computed.padding,
      paddingTop: computed.paddingTop,
      paddingRight: computed.paddingRight,
      paddingBottom: computed.paddingBottom,
      paddingLeft: computed.paddingLeft,
      
      // Margin
      margin: computed.margin,
      marginTop: computed.marginTop,
      marginRight: computed.marginRight,
      marginBottom: computed.marginBottom,
      marginLeft: computed.marginLeft,
      
      // Border
      border: computed.border,
      borderRadius: computed.borderRadius,
      
      // Typography
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      fontFamily: computed.fontFamily,
      lineHeight: computed.lineHeight,
      textAlign: computed.textAlign,
      
      // Effects
      boxShadow: computed.boxShadow !== 'none' ? computed.boxShadow : null,
      opacity: computed.opacity !== '1' ? computed.opacity : null,
      transform: computed.transform !== 'none' ? computed.transform : null,
      
      // Z-index
      zIndex: computed.zIndex !== 'auto' ? computed.zIndex : null,
      
      // Overflow
      overflow: computed.overflow !== 'visible' ? computed.overflow : null,
    };
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isActive) return;

    const element = e.target;
    if (element === hoveredElement) return;

    setHoveredElement(element);
    setElementStyles(getComputedStyles(element));
    setPosition({ x: e.clientX, y: e.clientY });
  }, [isActive, hoveredElement, getComputedStyles]);

  const handleKeyPress = useCallback((e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      onToggle();
    }
  }, [onToggle]);

  useEffect(() => {
    if (isActive) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('keydown', handleKeyPress);
      document.body.style.cursor = 'crosshair';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      setHoveredElement(null);
      setElementStyles(null);
      document.body.style.cursor = 'default';
    }

    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyPress);
      document.body.style.cursor = 'default';
    };
  }, [isActive, handleMouseMove, handleKeyPress]);

  if (!isActive || !hoveredElement || !elementStyles) return null;

  const rect = hoveredElement.getBoundingClientRect();

  return (
    <>
      {/* Highlight Box */}
      <div
        className="css-inspector-highlight"
        style={{
          position: 'fixed',
          top: rect.top + 'px',
          left: rect.left + 'px',
          width: rect.width + 'px',
          height: rect.height + 'px',
          pointerEvents: 'none',
          zIndex: 999999,
        }}
      />

      {/* Style Info Panel */}
      <div
        className="css-inspector-panel"
        style={{
          position: 'fixed',
          top: Math.min(position.y + 20, window.innerHeight - 400) + 'px',
          left: Math.min(position.x + 20, window.innerWidth - 320) + 'px',
          zIndex: 1000000,
        }}
      >
        <div className="inspector-header">
          <strong>{hoveredElement.tagName.toLowerCase()}</strong>
          {hoveredElement.className && typeof hoveredElement.className === 'string' && (
            <span className="inspector-class">.{hoveredElement.className.split(' ')[0]}</span>
          )}
          {hoveredElement.className && typeof hoveredElement.className === 'object' && hoveredElement.className.baseVal && (
            <span className="inspector-class">.{hoveredElement.className.baseVal.split(' ')[0]}</span>
          )}
        </div>

        <div className="inspector-section">
          <div className="inspector-label">📏 Размеры</div>
          <div className="inspector-value">{elementStyles.width} × {elementStyles.height}</div>
        </div>

        {(elementStyles.backgroundColor !== 'rgba(0, 0, 0, 0)' && elementStyles.backgroundColor !== 'transparent') && (
          <div className="inspector-section">
            <div className="inspector-label">🎨 Background</div>
            <div className="inspector-value">
              <span className="color-box" style={{ background: elementStyles.backgroundColor }}></span>
              {elementStyles.backgroundColor}
            </div>
          </div>
        )}

        {elementStyles.color && (
          <div className="inspector-section">
            <div className="inspector-label">✏️ Color</div>
            <div className="inspector-value">
              <span className="color-box" style={{ background: elementStyles.color }}></span>
              {elementStyles.color}
            </div>
          </div>
        )}

        <div className="inspector-section">
          <div className="inspector-label">📦 Display</div>
          <div className="inspector-value">{elementStyles.display}</div>
        </div>

        {elementStyles.display === 'flex' && (
          <>
            {elementStyles.flexDirection && (
              <div className="inspector-section">
                <div className="inspector-label">➡️ Flex Direction</div>
                <div className="inspector-value">{elementStyles.flexDirection}</div>
              </div>
            )}
            {elementStyles.justifyContent && (
              <div className="inspector-section">
                <div className="inspector-label">⬌ Justify Content</div>
                <div className="inspector-value">{elementStyles.justifyContent}</div>
              </div>
            )}
            {elementStyles.alignItems && (
              <div className="inspector-section">
                <div className="inspector-label">⬍ Align Items</div>
                <div className="inspector-value">{elementStyles.alignItems}</div>
              </div>
            )}
            {elementStyles.gap && (
              <div className="inspector-section">
                <div className="inspector-label">↔️ Gap</div>
                <div className="inspector-value">{elementStyles.gap}</div>
              </div>
            )}
          </>
        )}

        {elementStyles.display === 'grid' && (
          <>
            {elementStyles.gridTemplateColumns && (
              <div className="inspector-section">
                <div className="inspector-label">📊 Grid Columns</div>
                <div className="inspector-value">{elementStyles.gridTemplateColumns}</div>
              </div>
            )}
            {elementStyles.gridTemplateRows && (
              <div className="inspector-section">
                <div className="inspector-label">📊 Grid Rows</div>
                <div className="inspector-value">{elementStyles.gridTemplateRows}</div>
              </div>
            )}
            {elementStyles.gridGap && (
              <div className="inspector-section">
                <div className="inspector-label">↔️ Grid Gap</div>
                <div className="inspector-value">{elementStyles.gridGap}</div>
              </div>
            )}
          </>
        )}

        {elementStyles.padding !== '0px' && (
          <div className="inspector-section">
            <div className="inspector-label">📦 Padding</div>
            <div className="inspector-value">{elementStyles.padding}</div>
          </div>
        )}

        {elementStyles.margin !== '0px' && (
          <div className="inspector-section">
            <div className="inspector-label">📦 Margin</div>
            <div className="inspector-value">{elementStyles.margin}</div>
          </div>
        )}

        {elementStyles.fontSize && (
          <div className="inspector-section">
            <div className="inspector-label">🔤 Font Size</div>
            <div className="inspector-value">{elementStyles.fontSize}</div>
          </div>
        )}

        {elementStyles.boxShadow && (
          <div className="inspector-section">
            <div className="inspector-label">🌟 Box Shadow</div>
            <div className="inspector-value">{elementStyles.boxShadow}</div>
          </div>
        )}

        <div className="inspector-footer">
          Press <kbd>Ctrl+Shift+I</kbd> to toggle
        </div>
      </div>
    </>
  );
}

export default CSSInspector;
