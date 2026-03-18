# Google OAuth 설정 가이드 (GCP + Supabase)

> TimeNuts 구글 로그인 연동 가이드
> 작성일: 2026-03-18

---

## 전체 흐름

```
GCP Console에서 OAuth 앱 생성
        ↓
Client ID, Client Secret 발급
        ↓
Supabase 대시보드에 입력
        ↓
완료 - 구글 로그인 작동
```

---

## STEP 1. GCP Console - OAuth 동의 화면 설정

1. https://console.cloud.google.com 접속 → 로그인

2. 상단 프로젝트 선택 드롭다운 클릭 → **crispy-web 프로젝트 선택**
   - 없으면 "새 프로젝트" 클릭 → 이름: `crispy-web` (또는 원하는 이름)

3. 왼쪽 메뉴 → **API 및 서비스** → **OAuth 동의 화면**

4. User Type 선택:
   - **외부(External)** 선택 → 만들기
   - (내부는 Google Workspace 계정 전용이라 일반 Gmail 계정은 외부 사용)

5. 앱 정보 입력:
   ```
   앱 이름: TimeNuts
   사용자 지원 이메일: (본인 이메일)
   개발자 연락처 이메일: (본인 이메일)
   ```
   → **저장 후 계속**

6. 범위(Scopes) 화면 → 그냥 **저장 후 계속** (기본값 유지)

7. 테스트 사용자 화면:
   - **+ ADD USERS** 클릭
   - 가족 구성원 Gmail 주소 모두 추가
     ```
     예: mom@gmail.com
         dad@gmail.com
         kid@gmail.com
     ```
   - → **저장 후 계속**

8. 요약 확인 → **대시보드로 돌아가기**

---

## STEP 2. GCP Console - OAuth 클라이언트 ID 생성

1. 왼쪽 메뉴 → **API 및 서비스** → **사용자 인증 정보**

2. 상단 **+ 사용자 인증 정보 만들기** → **OAuth 클라이언트 ID**

3. 설정:
   ```
   애플리케이션 유형: 웹 애플리케이션
   이름: TimeNuts Web Client
   ```

4. **승인된 리디렉션 URI** 섹션에서 **+ URI 추가** 클릭:

   아래 URI를 **정확하게** 입력 (오타 주의!):
   ```
   https://elufbvcnhitoksoofbir.supabase.co/auth/v1/callback
   ```

   로컬 개발용도 추가 (선택, 개발 중에 테스트하려면):
   ```
   http://localhost:3000/auth/callback
   ```

5. **만들기** 클릭

6. 팝업에 **클라이언트 ID**와 **클라이언트 보안 비밀번호** 표시됨
   - 이 창을 닫지 말고 다음 스텝에서 사용
   - 또는 JSON 다운로드 버튼으로 저장해 두기

   ```
   클라이언트 ID:     xxxxxxxx.apps.googleusercontent.com
   클라이언트 보안:   GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxx
   ```

---

## STEP 3. Supabase 대시보드에 입력

1. https://supabase.com/dashboard 접속

2. **fresh-mint** 프로젝트 선택

3. 왼쪽 메뉴 → **Authentication** → **Providers**

4. **Google** 항목 클릭 → 토글로 **활성화(Enable)**

5. 입력:
   ```
   Client ID (for OAuth):      (STEP 2에서 복사한 클라이언트 ID)
   Client Secret (for OAuth):  (STEP 2에서 복사한 클라이언트 보안 비밀번호)
   ```

6. **Redirect URL** 확인 (자동으로 채워져 있어야 함):
   ```
   https://elufbvcnhitoksoofbir.supabase.co/auth/v1/callback
   ```
   → 이 값이 STEP 2에서 입력한 리디렉션 URI와 **완전히 일치**해야 함

7. **Save** 클릭

---

## STEP 4. 앱 URL 설정 (로컬 개발 vs 배포)

### 로컬 개발 시
`.env.local` 파일:
```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Cloudflare Pages 배포 후
Cloudflare Pages 환경변수에 추가:
```env
NEXT_PUBLIC_BASE_URL=https://timenuts.pages.dev
```

그리고 GCP OAuth 클라이언트의 승인된 리디렉션 URI에도 추가:
```
https://timenuts.pages.dev/auth/callback
```

---

## STEP 5. 테스트

1. `npm run dev` 실행

2. http://localhost:3000 접속

3. **Google로 로그인** 버튼 클릭

4. 구글 계정 선택 화면 → 가족 계정 선택

5. `/calendar` 로 리디렉션되면 성공 ✅

---

## 문제 해결

### "redirect_uri_mismatch" 에러가 나면
→ GCP에서 승인된 리디렉션 URI가 Supabase의 Redirect URL과 정확히 일치하는지 확인
→ `http` vs `https`, 마지막 `/` 유무 확인

### "Access blocked: This app's request is invalid" 에러
→ STEP 1의 OAuth 동의 화면 설정이 완료되지 않은 것
→ 앱이 "테스트" 상태인 경우 STEP 1-7에서 테스트 사용자로 추가된 계정만 로그인 가능

### 로그인은 되는데 캘린더로 안 넘어가면
→ Supabase → Authentication → URL Configuration 확인
→ Site URL: `http://localhost:3000` (로컬) 또는 `https://timenuts.pages.dev` (배포)
→ Redirect URLs에 `http://localhost:3000/**` 추가

---

## 배포 후 Google 앱 게시 (선택)

현재 상태: **테스트 모드** (추가한 테스트 사용자만 로그인 가능)

가족끼리만 쓰는 거라면 테스트 모드 그대로 사용해도 됩니다.
(테스트 사용자는 최대 100명까지 추가 가능)

공개 출시가 필요하면:
→ GCP → OAuth 동의 화면 → **앱 게시** 클릭
→ Google 검수 과정 필요 (1~2주 소요, 가족 앱은 필요 없음)

---

## 참고 링크

- GCP Console: https://console.cloud.google.com
- Supabase 대시보드: https://supabase.com/dashboard/project/elufbvcnhitoksoofbir/auth/providers
- Supabase Auth 공식 문서: https://supabase.com/docs/guides/auth/social-login/auth-google
