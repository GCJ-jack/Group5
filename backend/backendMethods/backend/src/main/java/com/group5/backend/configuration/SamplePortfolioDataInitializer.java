package com.group5.backend.configuration;

import com.group5.backend.model.PortfolioItem;
import com.group5.backend.repository.PortfolioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDateTime;
import java.util.List;

@Configuration
public class SamplePortfolioDataInitializer {

    @Bean
    CommandLineRunner seedPortfolioData(PortfolioRepository portfolioRepository) {
        return args -> {
            if (portfolioRepository.count() > 0) {
                return;
            }

            portfolioRepository.saveAll(List.of(
                    createHolding("NVDA", "Equity", 18, 92.50, LocalDateTime.now().minusDays(20)),
                    createHolding("AAPL", "Equity", 12, 164.80, LocalDateTime.now().minusDays(28)),
                    createHolding("MSFT", "Equity", 8, 338.40, LocalDateTime.now().minusDays(35)),
                    createHolding("GOOGL", "Equity", 15, 148.20, LocalDateTime.now().minusDays(18)),
                    createHolding("TSLA", "Equity", 6, 242.70, LocalDateTime.now().minusDays(14))
            ));
        };
    }

    private PortfolioItem createHolding(String ticker, String type, int quantity, double buyPrice, LocalDateTime time) {
        PortfolioItem item = new PortfolioItem();
        item.setTicker(ticker);
        item.setType(type);
        item.setQuantity(quantity);
        item.setBuyPrice(buyPrice);
        item.setTime(time);
        return item;
    }
}
