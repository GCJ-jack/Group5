//package com.group5.backend.service;
//
//import com.group5.backend.model.PortfolioItem;
//import com.group5.backend.repository.PortfolioRepository;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.stereotype.Service;
//
//import java.util.List;
//
//@Service
//public class PortfolioService {
//
//    @Autowired
//    private PortfolioRepository repository;
//
//    @Autowired
//    private PriceService priceService;
//
//    public List<PortfolioItem> getAll() {
//        return repository.findAll();
//    }
//
//    public PortfolioItem add(PortfolioItem item) {
//        return repository.save(item);
//    }
//
//    public void delete(Long id) {
//        repository.deleteById(id);
//    }
//
//    public double getTotalValue() {
//        return repository.findAll().stream()
//                .mapToDouble(item ->
//                        item.getQuantity() * priceService.getPrice(item.getTicker())
//                )
//                .sum();
//    }
//}
