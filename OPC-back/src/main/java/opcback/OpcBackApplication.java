package opcback;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

// @EnableScheduling: habilita el chequeo periódico de notificaciones de
// stock (NotificationReconciliationJob). Es el único trabajo programado.
@SpringBootApplication
@EnableScheduling
public class OpcBackApplication {

	public static void main(String[] args) {
		SpringApplication.run(OpcBackApplication.class, args);
	}

}
