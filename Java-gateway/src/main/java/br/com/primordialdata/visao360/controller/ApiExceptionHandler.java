package br.com.primordialdata.visao360.controller;

import br.com.primordialdata.visao360.client.AiGatewayException;
import br.com.primordialdata.visao360.service.orchestration.ProntuarioNaoEncontradoException;
import br.com.primordialdata.visao360.service.orchestration.InsightNaoEncontradoException;
import br.com.primordialdata.visao360.tenant.TenantRequiredException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler({ProntuarioNaoEncontradoException.class, InsightNaoEncontradoException.class})
    ProblemDetail handleNotFound(RuntimeException exception) {
        return problem(HttpStatus.NOT_FOUND, "Recurso clínico não encontrado", exception.getMessage());
    }

    @ExceptionHandler({TenantRequiredException.class, MethodArgumentNotValidException.class})
    ProblemDetail handleBadRequest(Exception exception) {
        return problem(HttpStatus.BAD_REQUEST, "Requisição inválida", "Os identificadores obrigatórios são inválidos.");
    }

    @ExceptionHandler(AiGatewayException.class)
    ProblemDetail handleAiUnavailable(AiGatewayException exception) {
        return problem(HttpStatus.BAD_GATEWAY, "Motor de IA indisponível", exception.getMessage());
    }

    private ProblemDetail problem(HttpStatus status, String title, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(title);
        return problem;
    }
}
