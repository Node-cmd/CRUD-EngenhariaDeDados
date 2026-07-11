class Usuario {

    constructor(dados = {}) {

        this.cpf = dados.cpf;
        this.nome = dados.nome;
        this.dataNascimento = dados.dataNascimento || dados.data_nascimento;

        this.email = dados.email;
        this.telefone = dados.telefone;

        this.login = dados.login;
        this.senha = dados.senha;
    }

    validar() {

        if (!this.cpf)
            throw new Error(
                "CPF obrigatório"
            );

        if (!this.nome)
            throw new Error(
                "Nome obrigatório"
            );

        if (!this.login)
            throw new Error(
                "Login obrigatório"
            );

        if (!this.senha)
            throw new Error(
                "Senha obrigatória"
            );

        return true;
    }

}

module.exports = Usuario;