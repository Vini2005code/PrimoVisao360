package br.com.primordialdata.visao360.lgpd.service;

import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PseudonimizacaoService {

    // Em um ambiente de produção em larga escala, este dicionário ficaria em um banco 
    // de cache rápido (como Redis) com tempo de expiração (TTL). 
    // Para a nossa arquitetura atual, usamos um ConcurrentHashMap para garantir segurança 
    // entre múltiplas threads simultâneas.
    private final Map<String, String> dicionarioTemporario = new ConcurrentHashMap<>();

    /**
     * Oculta dados sensíveis substituindo-os por identificadores opacos.
     */
    public String pseudonimizarPaciente(String nomePaciente, String textoProntuario) {
        if (nomePaciente == null || textoProntuario == null) {
            return textoProntuario;
        }

        // 1. Gera um identificador único (ex: 550e8400-e29b-41d4-a716-446655440000)
        String idOpaco = UUID.randomUUID().toString();

        // 2. Guarda o mapeamento seguro no nosso dicionário
        dicionarioTemporario.put(idOpaco, nomePaciente);

        // 3. Substitui todas as ocorrências do nome real no texto pelo ID opaco
        // Nota: Um algoritmo NLP avançado poderia ser acoplado aqui para capturar CPFs e telefones.
        return textoProntuario.replace(nomePaciente, idOpaco);
    }

    /**
     * Reverte a pseudonimização após o retorno do microsserviço Python.
     */
    public String reidentificarTexto(String idOpaco, String textoProcessado PelaIA) {
        if (idOpaco == null || textoProcessado == null) {
            return textoProcessado;
        }

        // 1. Busca o nome real no dicionário
        String nomeReal = dicionarioTemporario.get(idOpaco);

        if (nomeReal != null) {
            // 2. Remove o dado da memória permanentemente para cumprir a LGPD (Data Minimization)
            dicionarioTemporario.remove(idOpaco);

            // 3. Devolve o texto com o nome real restaurado
            return textoProcessado.replace(idOpaco, nomeReal);
        }

        return textoProcessado;
    }
}