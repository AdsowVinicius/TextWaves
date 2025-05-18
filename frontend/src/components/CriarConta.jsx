import React from "react";
import useForm from "../hooks/useForm";
import Input from "./Input";
import Button from "./Button";
import styles from "./CriarConta.module.css";
import { registerUser } from '../helpers/api'

const CriarConta = () => {
  const { formData, handleChange, resetForm } = useForm({
    email: "",
    username: "",
    password: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await registerUser(formData.username, formData.email, formData.password);
      alert("Conta criada com sucesso!");
      resetForm();
    } catch (error) {
      alert(error.message || "Erro ao registrar");
    }
  };

  return (
    <div className={styles.background}>
      <div className={styles.criarConta}>
        <img src="../public/img/criarconta.png" alt="" />
        <div>
          <h1>Criar Conta</h1>
          <form onSubmit={handleSubmit}>
            <Input
              label="Nome de Usuário"
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Digite seu nome de usuário"
            />
            <Input
              label="Email"
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Digite seu email"
            />
            <Input
              label="Senha"
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Digite sua senha"
            />
            <Button
              type="submit"
              disabled={!formData.email || !formData.password || !formData.username}
            >
              Registrar
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CriarConta;
