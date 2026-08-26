package br.com.primordialdata.visao360.service.orquestration;

import br.com.primordialdata.visao360.lgpd.service.PseudonimizacaoService;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service
public class Visao360Orquestrador {

    // Nossa ferramenta de LGPD
    private final PseudonimizacaoService lgpdService;

    // Injeção de Dependência: O Spring Boot entrega a ferramenta LGPD pronta para usarmos aqui
    public Visao360Orquestrador(PseudonimizacaoService lgpdService) {
        this.lgpdService = lgpdService;
    }

    /**
     * Este é o fluxo principal que o React vai acionar.
     */
    public String gerarInsights(String idPaciente) {
        
        // -----------------------------------------------------------------------------
        // FASE 1: BANCO DE DADOS E RLS (Protegido pelo nosso Porteiro Interno)
        // -----------------------------------------------------------------------------
        // Quando chamarmos o repositório aqui no futuro, o nosso RlsAspect
        // injetará o clinic_id invisivelmente no PostgreSQL antes do SELECT.
        
        // Simulando o dado que voltará do banco da outra equipe:
        String nomeReal = "Carlos Silva";
        String historicoBruto = "O paciente Carlos Silva relatou fortes dores de cabeça após o uso da medicação X.";
        
        // Para simplificar a re-identificação, vamos gerar o ID Opaco aqui no orquestrador
        String idOpaco = UUID.randomUUID().toString();


        // -----------------------------------------------------------------------------
        // FASE 2: LGPD - TÚNEL DE LAVAGEM
        // -----------------------------------------------------------------------------
        // Substituímos o "Carlos Silva" pelo ID UUID seguro.
        String historicoLimpo = lgpdService.pseudonimizarPaciente(nomeReal, historicoBruto);
        

        // -----------------------------------------------------------------------------
        // FASE 3: COMUNICAÇÃO COM PYTHON (IA)
        // -----------------------------------------------------------------------------
        // Futuramente, faremos uma requisição HTTP real para o FastAPI aqui.
        System.out.println(">>> Enviando para a IA (Python): " + historicoLimpo);
        
        // Simulando a resposta estruturada que o Python (Groq SDK) nos devolveria:
        String respostaDaIaPython = "A IA analisou os sintomas do paciente " + idOpaco + ". Risco: Enxaqueca Severa.";
        

        // -----------------------------------------------------------------------------
        // FASE 4: LGPD - RE-IDENTIFICAÇÃO
        // -----------------------------------------------------------------------------
        // Restauramos o nome real para o React poder exibir para o médico
        String respostaFinalParaOReact = lgpdService.reidentificarTexto(idOpaco, respostaDaIaPython);
        
        return respostaFinalParaOReact;
    }
}