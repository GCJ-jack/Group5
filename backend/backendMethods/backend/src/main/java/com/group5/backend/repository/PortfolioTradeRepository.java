package com.group5.backend.repository;

import com.group5.backend.model.PortfolioTrade;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PortfolioTradeRepository extends JpaRepository<PortfolioTrade, Long> {
    List<PortfolioTrade> findAllByOrderByTradeTimeDescIdDesc();
    List<PortfolioTrade> findAllByOrderByTradeTimeAscIdAsc();
}
