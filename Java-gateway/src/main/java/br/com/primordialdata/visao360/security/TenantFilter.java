package br.com.primordialdata.visao360.security;

import br.com.primordialdata.visao360.tenant.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class TenantFilter extends OncePerRequestFilter {

    private static final String TENANT_HEADER = "X-Clinic-ID";

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/actuator/") || "OPTIONS".equalsIgnoreCase(request.getMethod());
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String rawClinicId = request.getHeader(TENANT_HEADER);
        UUID clinicId = parseClinicId(rawClinicId);
        if (clinicId == null) {
            writeInvalidTenantResponse(response);
            return;
        }

        TenantContext.setClinicId(clinicId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    private UUID parseClinicId(String rawClinicId) {
        if (rawClinicId == null || rawClinicId.isBlank()) {
            return null;
        }
        try {
            UUID clinicId = UUID.fromString(rawClinicId.trim());
            return clinicId.equals(new UUID(0L, 0L)) ? null : clinicId;
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private void writeInvalidTenantResponse(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.BAD_REQUEST.value());
        response.setCharacterEncoding("UTF-8");
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.getWriter().write("""
                {"type":"about:blank","title":"Tenant inválido","status":400,"detail":"O cabeçalho X-Clinic-ID deve conter um UUID válido."}
                """);
    }
}
