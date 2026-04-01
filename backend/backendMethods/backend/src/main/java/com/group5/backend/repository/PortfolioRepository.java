package com.group5.backend.repository;

import com.group5.backend.model.PortfolioItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PortfolioRepository extends JpaRepository<PortfolioItem, Long> {
    List<PortfolioItem> findAllByTickerAndType(String ticker, String type);
    List<PortfolioItem> findAllByTicker(String ticker);
}
