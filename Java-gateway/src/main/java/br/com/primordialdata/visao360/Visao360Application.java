package br.com.primordialdata.visao360;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class Visao360Application {

    public static void main(String[] args) {
        SpringApplication.run(Visao360Application.class, args);
    }
}
