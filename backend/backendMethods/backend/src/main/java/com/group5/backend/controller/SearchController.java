package com.group5.backend.controller;

import com.group5.backend.model.dto.SearchResultDto;
import com.group5.backend.service.FinnhubService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping
@CrossOrigin(origins = "*")
public class SearchController {

    private final FinnhubService finnhubService;

    public SearchController(FinnhubService finnhubService) {
        this.finnhubService = finnhubService;
    }

    @GetMapping("/search")
    public ResponseEntity<List<SearchResultDto>> search(String keyword) {
        return ResponseEntity.ok(finnhubService.search(keyword));
    }
}
