package br.com.primordialdata.visao360.tenant;

public class TenantContext {

    // O nosso "armário com cadeado". Ele garante que a variável clinicId
    // seja única e isolada para cada médico que fizer uma requisição simultânea.
    private static final ThreadLocal<String> CURRENT_CLINIC = new ThreadLocal<>();

    // Guarda o ID da clínica na memória isolada desta requisição
    public static void setClinicId(String clinicId) {
        CURRENT_CLINIC.set(clinicId);
    }

    // Pega o ID da clínica (usaremos isso na hora de falar com o PostgreSQL)
    public static String getClinicId() {
        return CURRENT_CLINIC.get();
    }

    // A regra de ouro de segurança: Sempre limpar a memória depois de usar, 
    // para não vazar a informação para o próximo médico que usar a mesma "Thread" do servidor.
    public static void clear() {
        CURRENT_CLINIC.remove();
    }
}