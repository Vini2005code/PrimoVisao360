package br.com.primordialdata.visao360.lgpd.service;

import java.util.Objects;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class PseudonimizacaoService {

    private static final Pattern CPF = Pattern.compile("(?<!\\d)\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}(?!\\d)");
    private static final Pattern CNS = Pattern.compile("(?<!\\d)\\d{15}(?!\\d)");
    private static final Pattern RG = Pattern.compile(
            "(?i)\\b(RG\\s*[:#-]?\\s*)[0-9X.-]{5,20}\\b"
    );
    private static final Pattern EMAIL = Pattern.compile(
            "\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern TELEFONE = Pattern.compile(
            "(?<!\\d)(?:\\+?55\\s*)?\\(?\\d{2}\\)?[\\s.-]*9?\\d{4}[\\s.-]*\\d{4}(?!\\d)"
    );
    private static final Pattern CEP = Pattern.compile("(?<!\\d)\\d{5}-?\\d{3}(?!\\d)");
    private static final Pattern NOME_COMPLETO_PROVAVEL = Pattern.compile(
            "(?<![\\p{L}])\\p{Lu}[\\p{L}'-]{2,}"
                    + "(?:\\s+(?:(?:da|de|do|das|dos)\\s+)?\\p{Lu}[\\p{L}'-]{2,}){1,3}"
                    + "(?![\\p{L}])",
            Pattern.UNICODE_CHARACTER_CLASS
    );

    public PseudonimizacaoResultado pseudonimizar(String nomePaciente, String textoClinico) {
        Objects.requireNonNull(nomePaciente, "nomePaciente é obrigatório");
        Objects.requireNonNull(textoClinico, "textoClinico é obrigatório");

        UUID pacientePseudonimoId = UUID.randomUUID();
        String tokenPaciente = tokenPaciente(pacientePseudonimoId);
        String texto = pseudonimizarTexto(nomePaciente, tokenPaciente, textoClinico);

        if (contemIgnorandoCaixa(texto, nomePaciente)) {
            throw new IllegalStateException("A pseudonimização do nome não foi concluída.");
        }
        return new PseudonimizacaoResultado(
                pacientePseudonimoId,
                texto,
                nomePaciente
        );
    }

    public String pseudonimizar(
            PseudonimizacaoResultado contexto,
            String texto
    ) {
        Objects.requireNonNull(contexto, "contexto é obrigatório");
        Objects.requireNonNull(texto, "texto é obrigatório");
        String pseudonimizado = pseudonimizarTexto(
                contexto.nomeReal(),
                contexto.tokenPaciente(),
                texto
        );
        if (contemIgnorandoCaixa(pseudonimizado, contexto.nomeReal())) {
            throw new IllegalStateException("A pseudonimização do nome não foi concluída.");
        }
        return pseudonimizado;
    }

    public String pseudonimizarPerguntaPopulacional(String pergunta) {
        Objects.requireNonNull(pergunta, "pergunta é obrigatória");
        String pseudonimizada = removerIdentificadoresDiretos(pergunta);
        return NOME_COMPLETO_PROVAVEL.matcher(pseudonimizada)
                .replaceAll("[PESSOA_REMOVIDA]");
    }

    public String substituirTokenPaciente(
            String texto,
            String tokenAtual,
            String novoToken
    ) {
        Objects.requireNonNull(texto, "texto é obrigatório");
        Objects.requireNonNull(tokenAtual, "tokenAtual é obrigatório");
        Objects.requireNonNull(novoToken, "novoToken é obrigatório");
        if (tokenAtual.isBlank() || novoToken.isBlank()) {
            throw new IllegalArgumentException("Tokens não podem ser vazios.");
        }
        return texto.replace(tokenAtual, novoToken);
    }

    private String pseudonimizarTexto(
            String nomePaciente,
            String tokenPaciente,
            String textoClinico
    ) {
        String texto = removerIdentificadoresDiretos(textoClinico);
        texto = substituirIgnorandoCaixa(texto, nomePaciente, tokenPaciente);
        return texto;
    }

    private String removerIdentificadoresDiretos(String textoClinico) {
        String texto = textoClinico;
        texto = CPF.matcher(texto).replaceAll("[CPF_REMOVIDO]");
        texto = CNS.matcher(texto).replaceAll("[CNS_REMOVIDO]");
        texto = RG.matcher(texto).replaceAll("$1[RG_REMOVIDO]");
        texto = EMAIL.matcher(texto).replaceAll("[EMAIL_REMOVIDO]");
        texto = TELEFONE.matcher(texto).replaceAll("[TELEFONE_REMOVIDO]");
        texto = CEP.matcher(texto).replaceAll("[CEP_REMOVIDO]");
        return texto;
    }

    public String reidentificar(PseudonimizacaoResultado contexto, String textoProcessado) {
        Objects.requireNonNull(contexto, "contexto é obrigatório");
        return reidentificar(contexto.tokenPaciente(), contexto.nomeReal(), textoProcessado);
    }

    public String reidentificar(
            String tokenPaciente,
            String nomeReal,
            String textoProcessado
    ) {
        Objects.requireNonNull(tokenPaciente, "tokenPaciente é obrigatório");
        Objects.requireNonNull(nomeReal, "nomeReal é obrigatório");
        if (textoProcessado == null) {
            return null;
        }
        if (tokenPaciente.isBlank() || nomeReal.isBlank()) {
            throw new IllegalArgumentException("Token e nome real não podem ser vazios.");
        }
        return textoProcessado.replace(tokenPaciente, nomeReal);
    }

    private String substituirIgnorandoCaixa(String texto, String termo, String substituto) {
        if (termo.isBlank()) {
            throw new IllegalArgumentException("O nome do paciente não pode ser vazio.");
        }
        Pattern pattern = Pattern.compile(Pattern.quote(termo), Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
        return pattern.matcher(texto).replaceAll(Matcher.quoteReplacement(substituto));
    }

    private boolean contemIgnorandoCaixa(String texto, String termo) {
        return Pattern.compile(Pattern.quote(termo), Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE)
                .matcher(texto)
                .find();
    }

    private String tokenPaciente(UUID pacientePseudonimoId) {
        return "PACIENTE_" + pacientePseudonimoId;
    }

    public record PseudonimizacaoResultado(
            UUID pacientePseudonimoId,
            String textoPseudonimizado,
            String nomeReal
    ) {
        public PseudonimizacaoResultado {
            Objects.requireNonNull(pacientePseudonimoId);
            Objects.requireNonNull(textoPseudonimizado);
            Objects.requireNonNull(nomeReal);
        }

        public String tokenPaciente() {
            return "PACIENTE_" + pacientePseudonimoId;
        }
    }
}
