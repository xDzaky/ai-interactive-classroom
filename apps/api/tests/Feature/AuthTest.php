<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(array $overrides = []): User
    {
        return User::create(array_merge([
            'name'     => 'Test Teacher',
            'email'    => 'teacher@test.com',
            'password' => Hash::make('password123'),
            'role'     => 'teacher',
        ], $overrides));
    }

    // ── Login ──────────────────────────────────────────────────────────────

    public function test_login_returns_200_with_user_and_token_on_valid_credentials(): void
    {
        $this->makeUser();

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'teacher@test.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['user' => ['id', 'name', 'email', 'role', 'school_id'], 'token'])
            ->assertJsonPath('user.email', 'teacher@test.com')
            ->assertJsonPath('user.role', 'teacher');

        $this->assertNotEmpty($response->json('token'));
    }

    public function test_login_returns_422_on_wrong_password(): void
    {
        $this->makeUser();

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'teacher@test.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(422)
            ->assertJsonStructure(['message', 'errors', 'code'])
            ->assertJsonPath('code', 'VALIDATION_ERROR');
    }

    public function test_login_returns_422_on_missing_fields(): void
    {
        $response = $this->postJson('/api/v1/auth/login', []);

        $response->assertStatus(422)
            ->assertJsonPath('code', 'VALIDATION_ERROR')
            ->assertJsonStructure(['errors' => ['email', 'password']]);
    }

    public function test_login_returns_422_for_nonexistent_user(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'nobody@test.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(422);
    }

    // ── Me ─────────────────────────────────────────────────────────────────

    public function test_me_returns_authenticated_user(): void
    {
        $user = $this->makeUser();

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.email', $user->email);
    }

    public function test_me_returns_401_when_unauthenticated(): void
    {
        $this->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    // ── Logout ─────────────────────────────────────────────────────────────

    public function test_logout_returns_200_for_authenticated_user(): void
    {
        $user = $this->makeUser();
        $token = $user->createToken('web')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/v1/auth/logout')
            ->assertStatus(200)
            ->assertJsonPath('message', 'Logged out successfully');
    }

    public function test_logout_returns_401_when_unauthenticated(): void
    {
        $this->postJson('/api/v1/auth/logout')->assertStatus(401);
    }

    public function test_login_revokes_previous_token_for_same_device(): void
    {
        $user = $this->makeUser();
        // First login
        $r1 = $this->postJson('/api/v1/auth/login', ['email' => 'teacher@test.com', 'password' => 'password123']);
        $token1 = $r1->json('token');
        // Second login same device
        $r2 = $this->postJson('/api/v1/auth/login', ['email' => 'teacher@test.com', 'password' => 'password123']);
        $token2 = $r2->json('token');

        // Old token should be invalid
        $this->withToken($token1)->getJson('/api/v1/auth/me')->assertStatus(401);
        // New token should work
        $this->withToken($token2)->getJson('/api/v1/auth/me')->assertStatus(200);
    }
}
