package spring.backend.game;

import org.springframework.boot.SpringApplication;

public class TestGameApplication {

	public static void main(String[] args) {
		SpringApplication.from(GameApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
