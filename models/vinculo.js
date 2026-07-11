class Vinculo {

    constructor(dados = {}) {

        this.idVinculo = dados.idVinculo;
        this.matricula = dados.matricula || dados.mat_estudante;
        this.idCurso = dados.idCurso || dados.curso;
        this.dataIngresso = dados.dataIngresso || dados.data_entrada;
        this.status = dados.status;
        this.dataSaida = dados.dataSaida || dados.data_saida;
    }

    validar() {

        if (!this.matricula)
            throw new Error(
                "Matrícula obrigatória"
            );

        if (!this.idCurso)
            throw new Error(
                "Curso obrigatório"
            );

        if (!this.status)
            throw new Error(
                "Status obrigatório"
            );

        return true;
    }

}

module.exports = Vinculo;