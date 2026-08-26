package br.com.primordialdata.visao360.security;

import br.com.primordialdata.visao360.tenant.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class TenantFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        // 1. Extraímos o ID da clínica que o React enviou na requisição HTTP
        // (Nota: No futuro, extrairemos isso de forma criptografada de um Token JWT)
        String clinicId = request.getHeader("X-Clinic-ID");

        // 2. Se a requisição tem o ID da clínica, nós guardamos no nosso "cofre" (ThreadLocal)
        if (clinicId != null && !clinicId.trim().isEmpty()) {
            TenantContext.setClinicId(clinicId);
        }

        try {
            // 3. Mandamos o Spring continuar o trabalho dele (ir para as próximas camadas)
            filterChain.doFilter(request, response);
        } finally {
            // 4. A REGRA INEGOCIÁVEL DE SEGURANÇA E LGPD:
            // O bloco 'finally' sempre executa, mesmo que o código dê erro.
            // Aqui nós limpamos o ID da clínica da memória para não vazar para a próxima requisição.
            TenantContext.clear();
        }
    }
}