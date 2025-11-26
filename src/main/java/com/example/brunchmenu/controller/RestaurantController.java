package com.example.brunchmenu.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;

@RestController
@CrossOrigin(origins = "*") // 모든 출처에서의 요청 허용 (VS Code Live Server 등)
public class RestaurantController {

    @GetMapping("/api/restaurants")
    public List<Map<String, String>> getNearbyRestaurants(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "한식") String category
    ) {
        System.out.println("요청 - 위도: " + latitude + ", 경도: " + longitude + ", 카테고리: " + category);

        return generateDummyRestaurants(category);
    }

    private List<Map<String, String>> generateDummyRestaurants(String category) {
        List<Map<String, String>> restaurants = new ArrayList<>();
        String[] foodNames;

        switch (category) {
            case "한식":
                foodNames = new String[]{"김치찌개 맛집", "된장찌개 전문점", "비빔밥 천국", "삼겹살 파티", "불고기 정식", "감자탕 형제들", "순두부 마을", "제육볶음 식당", "설렁탕 한그릇", "떡볶이 분식"};
                break;
            case "중식":
                foodNames = new String[]{"짜장면 시키신분", "짬뽕의 전설", "탕수육 공장", "마라탕 월드", "볶음밥 반점", "딤섬 가든", "깐풍기 호프", "양꼬치 앤 칭따오", "유산슬 명가", "고추잡채 식당"};
                break;
            case "일식":
                foodNames = new String[]{"스시 오마카세", "라멘 트럭", "돈카츠 제작소", "우동 한그릇", "소바 전문점", "규동 하우스", "타코야끼 트럭", "텐동 튀김덮밥", "야끼니쿠 식당", "사케동 연어"};
                break;
            case "양식":
                foodNames = new String[]{"스테이크 하우스", "파스타 가든", "화덕 피자", "수제 버거킹", "리조또 팩토리", "브런치 카페", "샐러드 보울", "샌드위치 샵", "바베큐 플래터", "타코 멕시칸"};
                break;
            default:
                foodNames = new String[]{"맛집 1", "맛집 2", "맛집 3", "맛집 4", "맛집 5", "맛집 6", "맛집 7", "맛집 8", "맛집 9", "맛집 10"};
        }

        Random random = new Random();
        for (int i = 0; i < 10; i++) {
            int distance = (i + 1) * 50 + random.nextInt(30); // 거리 랜덤 변화
            restaurants.add(Map.of(
                "name", foodNames[i],
                "category", category,
                "distance", distance + "m",
                "address", "서울시 강남구 맛집로 " + (i + 1) + "길"
            ));
        }

        return restaurants;
    }
}
