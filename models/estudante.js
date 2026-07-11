class Estudante {

    constructor(dados = {}) {

        this.matricula = dados.matricula || dados.mat_estudante;
        this.cpf = dados.cpf;
        this.mc = dados.mc;
        this.anoIngresso = dados.anoIngresso || dados.ano_ingresso;
    }

    validar() {

        if (!this.cpf)
            throw new Error(
                "CPF obrigatório"
            );

        if (!this.matricula)
            throw new Error(
                "Matrícula obrigatória"
            );

        if (!this.anoIngresso && this.anoIngresso !== 0)
            throw new Error(
                "Ano de ingresso obrigatório"
            );

        return true;
    }

}

module.exports = Estudante;