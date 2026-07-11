class Curso {

    constructor(dados = {}) {

        this.idCurso = dados.idCurso || dados.cod_curso;
        this.nome = dados.nome;
        this.grau = dados.grau;
        this.turno = dados.turno;
        this.campus = dados.campus;
        this.nivel = dados.nivel;
    }

    validar() {

        if (!this.nome)
            throw new Error(
                "Nome obrigatório"
            );

        if (!this.grau)
            throw new Error(
                "Grau obrigatório"
            );

        if (!this.turno)
            throw new Error(
                "Turno obrigatório"
            );

        return true;
    }

}

module.exports = Curso;