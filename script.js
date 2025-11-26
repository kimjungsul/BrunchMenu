// ============================================================
// [중요] 카카오 개발자 센터(https://developers.kakao.com)에서 발급받은
// [JavaScript 키]를 아래 변수에 넣어주세요!
// ============================================================
const KAKAO_API_KEY = 'f3007cbf6c053329c9f18df03c2b30e7'; 

let currentRestaurants = [];

// 위치 정보 캐싱 변수 (모바일 속도 개선용)
let cachedLat = null;
let cachedLng = null;

// 카테고리별 검색 키워드 매핑
const categoryKeywords = {
    "한식": "한식",
    "중식": "중식",
    "일식": "일식",
    "양식": "양식"
};

function loadRestaurants(category) {
    // API 키 체크 (공백 제거 등 안전장치)
    if (!KAKAO_API_KEY || KAKAO_API_KEY.includes('여기에')) {
        alert('script.js 파일을 열어서 [KAKAO_API_KEY] 변수에 키를 먼저 입력해주세요!');
        return;
    }

    const loadingEl = document.getElementById('loading');
    const resultContainer = document.getElementById('result-container');
    const listEl = document.getElementById('restaurant-list');
    const randomBtn = document.getElementById('random-btn');

    // 화면 초기화
    resultContainer.classList.add('hidden');
    randomBtn.classList.add('hidden');
    loadingEl.classList.remove('hidden');
    listEl.innerHTML = '';

    // [수정] 이미 위치 정보가 있으면 바로 API 호출 (속도 개선)
    if (cachedLat && cachedLng) {
        console.log("캐시된 위치 사용:", cachedLat, cachedLng);
        searchPlacesWithSDK(cachedLat, cachedLng, categoryKeywords[category]);
        return;
    }

    if (!navigator.geolocation) {
        alert('위치 정보를 지원하지 않는 브라우저입니다.');
        loadingEl.classList.add('hidden');
        return;
    }

    // 위치 정보가 없으면 새로 요청
    navigator.geolocation.getCurrentPosition(
        (position) => {
            cachedLat = position.coords.latitude;
            cachedLng = position.coords.longitude;
            console.log("새로운 위치 갱신:", cachedLat, cachedLng);
            
            // 카카오 SDK 검색 호출
            searchPlacesWithSDK(cachedLat, cachedLng, categoryKeywords[category]);
        },
        (error) => {
            console.error(error);
            alert('위치 권한이 필요합니다. 브라우저 설정에서 위치 권한을 허용해주세요.');
            loadingEl.classList.add('hidden');
        },
        // [옵션 추가] 정확도 보다는 속도 우선, 캐시된 위치 사용 가능 시간 설정
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
}

function searchPlacesWithSDK(lat, lng, keyword) {
    // 이미 SDK가 로드되어 있는지 확인
    if (!window.kakao || !window.kakao.maps) {
        const script = document.createElement('script');
        // autoload=false 파라미터 중요
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&libraries=services&autoload=false`;
        script.onload = () => {
            kakao.maps.load(() => {
                executeSearch(lat, lng, keyword);
            });
        };
        script.onerror = () => {
            alert('카카오 지도 API 로드 실패! API 키나 도메인 설정을 확인해주세요.');
            document.getElementById('loading').classList.add('hidden');
        };
        document.head.appendChild(script);
    } else {
        executeSearch(lat, lng, keyword);
    }
}

function executeSearch(lat, lng, keyword) {
    const ps = new kakao.maps.services.Places();
    const loadingEl = document.getElementById('loading');
    const randomBtn = document.getElementById('random-btn');

    const options = {
        location: new kakao.maps.LatLng(lat, lng),
        radius: 1000, // 1km 반경
        sort: kakao.maps.services.SortBy.DISTANCE,
        size: 15 // 최대 개수(15)로 가져와서 섞음
    };

    ps.keywordSearch(keyword, (data, status, pagination) => {
        loadingEl.classList.add('hidden');

        if (status === kakao.maps.services.Status.OK) {
            // [수정] 데이터를 랜덤하게 섞은 후 상위 10개만 선택
            const shuffledData = data.sort(() => 0.5 - Math.random());
            const selectedData = shuffledData.slice(0, 10);

            currentRestaurants = selectedData.map(place => ({
                id: place.id, // 고유 ID 저장
                name: place.place_name,
                category: place.category_name.split('>').pop().trim(),
                distance: place.distance + 'm',
                address: place.road_address_name || place.address_name,
                url: place.place_url
            }));

            displayRestaurants(currentRestaurants);
            
            if (currentRestaurants.length > 0) {
                randomBtn.classList.remove('hidden');
            }

        } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
            displayRestaurants([]);
            alert('주변 1km 내에 해당 메뉴의 음식점이 없어요 ㅠㅠ');
        } else {
            alert('검색 중 오류가 발생했습니다.');
        }
    }, options);
}

function displayRestaurants(restaurants) {
    const resultContainer = document.getElementById('result-container');
    const listEl = document.getElementById('restaurant-list');

    if (restaurants.length === 0) {
        listEl.innerHTML = '<li class="restaurant-item">검색 결과가 없습니다.</li>';
    } else {
        restaurants.forEach((place, index) => {
            const li = document.createElement('li');
            li.className = 'restaurant-item';
            li.id = `item-${index}`;
            
            // HTML 구성 (CSS Flex 구조에 맞게 변경)
            li.innerHTML = `
                <div class="restaurant-info" style="flex:1; width:100%;">
                    <div class="restaurant-name">${place.name}</div>
                    <div class="restaurant-meta">
                        <span>${place.category}</span> | 
                        <span>${place.distance}</span>
                    </div>
                    <div class="restaurant-address">${place.address}</div>
                </div>
                
                <div class="btn-group">
                    <a href="${place.url}" target="_blank" class="action-btn map-btn">지도</a>
                    <button class="action-btn save-btn" onclick="saveRestaurant('${place.id}')">저장</button>
                </div>
            `;
            listEl.appendChild(li);
        });
    }

    resultContainer.classList.remove('hidden');
}

// =======================
// 카테고리 랜덤 추첨 기능
// =======================
function pickRandomCategory() {
    const categories = ["한식", "중식", "일식", "양식"];
    const buttons = {
        "한식": document.getElementById('btn-korean'),
        "중식": document.getElementById('btn-chinese'),
        "일식": document.getElementById('btn-japanese'),
        "양식": document.getElementById('btn-western')
    };
    
    const randomBtn = document.getElementById('btn-random-cat');
    if (randomBtn) randomBtn.disabled = true;

    let count = 0;
    const maxCount = 15; // 15번 깜빡임
    const speed = 100;

    // 애니메이션
    const interval = setInterval(() => {
        // 모든 버튼 스타일 초기화
        Object.values(buttons).forEach(btn => {
            btn.style.transform = "scale(1)";
            btn.style.boxShadow = "none";
            btn.style.backgroundColor = "#007bff";
        });

        const randomCat = categories[Math.floor(Math.random() * categories.length)];
        const targetBtn = buttons[randomCat];

        // 하이라이트 효과
        targetBtn.style.transform = "scale(1.1)";
        targetBtn.style.backgroundColor = "#ff6b6b";
        targetBtn.style.boxShadow = "0 0 15px rgba(255, 107, 107, 0.6)";

        count++;

        if (count >= maxCount) {
            clearInterval(interval);
            if (randomBtn) randomBtn.disabled = false;
            
            // 최종 선택된 카테고리로 로딩 실행
            setTimeout(() => {
               loadRestaurants(randomCat); 
            }, 300);
        }
    }, speed);
}

// =======================
// 저장 기능 (LocalStorage)
// =======================
function saveRestaurant(placeId) {
    const place = currentRestaurants.find(p => p.id === placeId);
    if (!place) return;

    let savedList = JSON.parse(localStorage.getItem('myRestaurants')) || [];
    
    // 중복 체크
    if (savedList.some(saved => saved.id === place.id)) {
        alert('이미 저장된 맛집입니다!');
        return;
    }

    savedList.push(place);
    localStorage.setItem('myRestaurants', JSON.stringify(savedList));
    alert(`"${place.name}" 저장 완료!`);
}

function openSavedList() {
    const modal = document.getElementById('saved-modal');
    const listEl = document.getElementById('saved-list');
    const savedList = JSON.parse(localStorage.getItem('myRestaurants')) || [];

    listEl.innerHTML = '';
    modal.classList.remove('hidden');

    if (savedList.length === 0) {
        listEl.innerHTML = '<li style="padding:20px;">아직 저장된 맛집이 없습니다.</li>';
    } else {
        savedList.forEach((place) => {
            const li = document.createElement('li');
            li.className = 'restaurant-item'; // 스타일 재사용
            li.style.marginBottom = '10px';
            li.innerHTML = `
                <div class="restaurant-name">${place.name}</div>
                <div class="restaurant-address">${place.address}</div>
                <div class="btn-group">
                    <a href="${place.url}" target="_blank" class="action-btn map-btn">지도</a>
                    <button class="action-btn" style="background:#ff6b6b; color:white;" onclick="removeSaved('${place.id}')">삭제</button>
                </div>
            `;
            listEl.appendChild(li);
        });
    }
}

function removeSaved(placeId) {
    let savedList = JSON.parse(localStorage.getItem('myRestaurants')) || [];
    savedList = savedList.filter(p => p.id !== placeId);
    localStorage.setItem('myRestaurants', JSON.stringify(savedList));
    openSavedList(); // 리스트 새로고침
}

function closeSavedList() {
    document.getElementById('saved-modal').classList.add('hidden');
}

// =======================
// 당첨 팝업 관련 기능
// =======================
function closeWinnerModal() {
    document.getElementById('winner-modal').classList.add('hidden');
}

// =======================
// 랜덤 추첨 기능
// =======================
function startRandomSelection() {
    const items = document.querySelectorAll('#restaurant-list .restaurant-item');
    if (items.length === 0) return;

    const randomBtn = document.getElementById('random-btn');
    randomBtn.disabled = true;
    
    items.forEach(item => {
        item.classList.remove('active', 'selected');
    });

    let currentIndex = 0;
    const speed = 100;
    
    const interval = setInterval(() => {
        if (currentIndex > 0) {
             items[currentIndex - 1].classList.remove('active');
        } else if (currentIndex === 0 && items[items.length - 1].classList.contains('active')) {
             items[items.length - 1].classList.remove('active');
        }

        if (currentIndex < items.length) {
            items[currentIndex].classList.add('active');
            currentIndex++;
        } else {
            clearInterval(interval);
            items[items.length - 1].classList.remove('active');
            
            setTimeout(() => {
                selectFinalWinner(items);
                randomBtn.disabled = false;
            }, 200);
        }
    }, speed);
}

function selectFinalWinner(items) {
    const randomIndex = Math.floor(Math.random() * items.length);
    const winnerItem = items[randomIndex];
    
    // 당첨된 데이터 찾기 (index로 매핑)
    const winnerData = currentRestaurants[randomIndex];

    winnerItem.classList.add('selected');
    winnerItem.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // 0.5초 뒤에 팝업 띄우기
    setTimeout(() => {
        showWinnerModal(winnerData);
    }, 500);
}

function showWinnerModal(winnerData) {
    const modal = document.getElementById('winner-modal');
    
    // 팝업 내용 채우기
    document.getElementById('winner-name').textContent = winnerData.name;
    document.getElementById('winner-address').textContent = winnerData.address;
    document.getElementById('winner-map-btn').href = winnerData.url;
    
    modal.classList.remove('hidden');
}
