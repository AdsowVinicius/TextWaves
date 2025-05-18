import { useState } from "react";

const useForm = (valores) => {
  const [formData, setFormData] = useState(valores);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData(valores);
  };

  return { formData, handleChange, resetForm };
};

export default useForm;
