package br.com.primordialdata.visao360.tenant;

public class TenantRequiredException extends RuntimeException {

    public TenantRequiredException() {
        super("Contexto da clínica ausente.");
    }
}
