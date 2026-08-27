package br.com.primordialdata.visao360.service.orchestration;

import java.util.UUID;

public class ProntuarioNaoEncontradoException extends RuntimeException {

    public ProntuarioNaoEncontradoException(UUID pacienteId) {
        super("Prontuário não encontrado para o paciente informado.");
    }
}
