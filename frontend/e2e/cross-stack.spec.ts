import { expect, test, type Page } from '@playwright/test';
import { createHmac } from 'node:crypto';

interface TestAccount {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  homeCity: string;
}

const account = (prefix: string): TestAccount => ({
  username: `${prefix}_${Date.now()}`,
  firstName: `${prefix}First`,
  lastName: 'Integration',
  email: `${prefix}_${Date.now()}@example.com`,
  password: 'test-password-123',
  homeCity: 'Nashville',
});

function expiredToken(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: 'expired-test-user', iat: 1, exp: 2 })).toString('base64url');
  const signature = createHmac('sha256', 'local-playwright-only-signing-secret')
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

async function register(page: Page, user: TestAccount): Promise<void> {
  page.on('pageerror', (error) => console.error('Browser page error:', error.message));
  await page.goto('/register');
  await page.getByLabel('Username').fill(user.username);
  await page.getByLabel('First name').fill(user.firstName);
  await page.getByLabel('Last name').fill(user.lastName);
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page.getByLabel('Account type').selectOption('student');
  await page.getByLabel('Home city').fill(user.homeCity);
  const response = page.waitForResponse((r) => r.url().endsWith('/accounts') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create account' }).click();
  const registrationResponse = await response;
  const responseBody = await registrationResponse.json();
  expect(registrationResponse.status(), JSON.stringify(responseBody)).toBe(201);
  expect(responseBody.username).toBe(user.username);
  await expect(page.locator('p[role="status"]')).toContainText(`Account created for ${user.username}`, { timeout: 15_000 });
}

async function login(page: Page, user: TestAccount): Promise<{ uuid: string }> {
  await page.goto('/login');
  await page.getByLabel('Username').fill(user.username);
  await page.getByLabel('Password').fill(user.password);
  const response = page.waitForResponse((r) => r.url().endsWith('/accounts/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Log in' }).click();
  const loginResponse = await response;
  expect(loginResponse.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/locations$/);
  const loginPayload = await loginResponse.json();
  expect(loginPayload.access_token).toBeTruthy();
  expect(loginPayload.token_type).toBe('bearer');
  expect(await page.evaluate(() => sessionStorage.getItem('accessToken'))).toBe(loginPayload.access_token);
  expect(JSON.parse(await page.evaluate(() => sessionStorage.getItem('currentAccount'))).uuid).toBe(loginPayload.uuid);
  return loginPayload;
}

test('Angular completes real account, location, review, friends, and photo HTTP flows against FastAPI', async ({ page, request }) => {
  test.setTimeout(90_000);
  // FollowApi currently hardcodes localhost:8000. Forward only that request to
  // this run's isolated FastAPI process, preserving its method, headers, and body.
  await page.route('http://localhost:8000/follows/**', (route) => {
    const url = route.request().url().replace('http://localhost:8000', 'http://127.0.0.1:18000');
    return route.continue({ url });
  });
  const first = account('first');
  const second = account('second');

  await register(page, first);

  // Login failure is a real request to FastAPI and should keep the user on login.
  await page.goto('/login');
  await page.getByLabel('Username').fill(first.username);
  await page.getByLabel('Password').fill('incorrect-password');
  const badLoginResponsePromise = page.waitForResponse((r) => r.url().endsWith('/accounts/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Log in' }).click();
  expect((await badLoginResponsePromise).status()).toBe(401);
  await expect(page.getByRole('alert')).toContainText('Invalid username or password');

  const firstLogin = await login(page, first);

  const secondRegistration = await request.post('http://127.0.0.1:18000/accounts', {
    data: {
      username: second.username,
      first_name: second.firstName,
      last_name: second.lastName,
      email: second.email,
      password: second.password,
      year_graduation: null,
      type: 'student',
      home_city: second.homeCity,
    },
  });
  expect(secondRegistration.status()).toBe(201);

  // Angular Discover search and Follow/Unfollow mutations use the real API.
  await page.getByRole('button', { name: 'Friends', exact: true }).click();
  await page.getByLabel('Search people').fill(second.firstName);
  await expect(page.getByText(`${second.firstName} ${second.lastName}`)).toBeVisible();
  await page.getByRole('button', { name: 'Follow', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Following', exact: true })).toBeVisible();
  const follows = await request.get('http://127.0.0.1:18000/follows/');
  const relationships = await follows.json();
  expect(relationships).toHaveLength(1);
  expect(relationships[0].from_user_id).toBe(firstLogin.uuid);
  await page.getByRole('button', { name: 'Following', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Follow', exact: true })).toBeVisible();
  expect((await (await request.get('http://127.0.0.1:18000/follows/')).json())).toHaveLength(0);
  await page.getByRole('button', { name: 'Dining', exact: true }).click();

  // The list and detail route both request location data from the test API.
  await expect(page.locator('.dining-card')).toContainText('Integration Commons');
  await page.locator('.dining-card').click();
  await expect(page).toHaveURL(/\/locations\/integration-commons$/);
  await expect(page.getByRole('heading', { name: 'Reviews', exact: true })).toBeVisible();

  await page.getByRole('button', { name: /Rate & review/ }).click();
  await page.getByRole('spinbutton', { name: 'Rating' }).fill('9');
  await page.getByRole('combobox', { name: 'Meal' }).click();
  await page.getByRole('option', { name: 'Lunch' }).click();
  await page.getByRole('textbox', { name: 'Review' }).fill('A real browser-to-API review');
  const pngDataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#d98b4d';
    context.fillRect(0, 0, 64, 64);
    return canvas.toDataURL('image/png');
  });
  const png = Buffer.from(pngDataUrl.split(',')[1], 'base64');
  await page.locator('input[type="file"]').setInputFiles({ name: 'meal.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByAltText('Selected food photo preview')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit review' })).toBeEnabled();

  const token = await page.evaluate(() => sessionStorage.getItem('accessToken'));
  const uploadResponse = page.waitForResponse((r) => r.url().endsWith('/photos/') && r.request().method() === 'POST');
  const createResponse = page.waitForResponse((r) => r.url().endsWith('/reviews/') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Submit review' }).click();
  const uploaded = await uploadResponse;
  expect(uploaded.status(), await uploaded.text()).toBe(201);
  expect(uploaded.request().headers()['authorization']).toBe(`Bearer ${token}`);
  const created = await createResponse;
  expect(created.request().headers()['authorization']).toBe(`Bearer ${token}`);
  const successReceivedAt = process.hrtime.bigint();
  expect(created.status()).toBe(200);
  const savedReview = await created.json();
  expect(savedReview.photo_ids).toHaveLength(1);
  await expect(page.getByText('A real browser-to-API review')).toBeVisible();
  const elapsedMs = Number(process.hrtime.bigint() - successReceivedAt) / 1_000_000;
  test.info().annotations.push({ type: 'create-to-visible-ms', description: elapsedMs.toFixed(1) });
  console.info(`Review visible ${elapsedMs.toFixed(1)} ms after successful FastAPI response`);
  expect(elapsedMs).toBeLessThan(5_000);
  await expect(page.locator('.rating-card .score').nth(0)).toContainText('9.0');
  await expect(page.locator('.rating-card .score').nth(2)).toContainText('1');

  // Confirm the API persisted it, and the exact saved image is served publicly.
  const persisted = await request.get('http://127.0.0.1:18000/reviews/?location_id=integration-commons');
  expect((await persisted.json()).map((review) => review.uuid)).toContain(savedReview.uuid);
  const image = await request.get(`http://127.0.0.1:18000/photos/${savedReview.photo_ids[0]}`);
  expect(image.ok()).toBeTruthy();
  expect(image.headers()['content-type']).toMatch(/^image\//);
  const expiredUpload = await request.post('http://127.0.0.1:18000/photos/', {
    headers: { Authorization: `Bearer ${expiredToken()}` },
    multipart: { file: { name: 'expired.png', mimeType: 'image/png', buffer: png } },
  });
  expect(expiredUpload.status()).toBe(401);
  await expect(page.locator('.review-photos img')).toHaveAttribute('src', new RegExp(savedReview.photo_ids[0]));
  await expect(page.locator('.photo-row img')).toHaveCount(1);
  expect(token).toBeTruthy();

  await page.getByRole('link', { name: `View profile for ${first.firstName} ${first.lastName}` }).click();
  await expect(page).toHaveURL(new RegExp(`/profile/${firstLogin.uuid}$`));
  await expect(page.getByRole('heading', { name: `${first.firstName} ${first.lastName}` })).toBeVisible();
  await expect(page.getByText('A real browser-to-API review')).toBeVisible();
  await expect(page.locator('.review-photos img')).toHaveCount(1);
  await page.getByRole('button', { name: 'Dining spots' }).click();
  await page.locator('.dining-card').click();

  // Edit and delete are confirmed by FastAPI responses and refreshed UI state.
  await page.getByRole('button', { name: 'Options for your review' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await page.getByRole('textbox', { name: 'Review' }).fill('Edited through the browser');
  const updateResponse = page.waitForResponse((r) => r.url().endsWith(`/reviews/${savedReview.uuid}`) && r.request().method() === 'PUT');
  await page.getByRole('button', { name: 'Save changes' }).click();
  const updated = await updateResponse;
  expect(updated.ok()).toBeTruthy();
  expect((await updated.json()).photo_ids).toEqual(savedReview.photo_ids);
  await expect(page.getByText('Edited through the browser')).toBeVisible();

  await page.getByRole('button', { name: 'Options for your review' }).click();
  const deleteResponse = page.waitForResponse((r) => r.url().endsWith(`/reviews/${savedReview.uuid}`) && r.request().method() === 'DELETE');
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  // ReviewItem emits the delete action directly; no confirmation dialog is used.
  expect((await deleteResponse).ok()).toBeTruthy();
  await expect(page.getByText('Edited through the browser')).toHaveCount(0);
  await expect(page.locator('.rating-card .score').nth(0)).toContainText('—');
  await expect(page.locator('.rating-card .score').nth(2)).toContainText('0');
  await expect(page.locator('.photo-row img')).toHaveCount(0);

});
