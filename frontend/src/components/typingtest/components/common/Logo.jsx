import React from "react";
import KeyboardAltIcon from "@mui/icons-material/KeyboardAlt";

const Logo = ({ isFocusedMode }) => {

  return (
    <div className="header" style={{visibility: isFocusedMode ? 'hidden' : 'visible' }}>
      <h1>
        Клавиатурный тренажер <KeyboardAltIcon fontSize="large" />
      </h1>
      <span className="sub-header">
        тренировка скорости ваших пальцев...
      </span>
    </div>
  );
};

export default Logo;
