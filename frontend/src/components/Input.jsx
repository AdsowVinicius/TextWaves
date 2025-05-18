import React from "react";

const Input = ({ label, type, id, value, onChange, placeholder }) => {
  return (
    <div>
      <label htmlFor={id}>
        {label}
      </label>
      <input
        type={type}
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
      />
    </div>
  );
};

export default Input;
