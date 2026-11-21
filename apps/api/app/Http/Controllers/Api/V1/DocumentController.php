<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\IngestDocument;
use App\Models\Document;
use App\Models\School;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    /**
     * Upload a document for school-scoped ingestion.
     * POST /api/v1/schools/{school}/documents
     * Auth: teacher or school_admin (Sanctum)
     * Returns: 202 {document_id, status:"queued"}
     */
    public function store(Request $request, School $school): JsonResponse
    {
        // Authorization: must be a member with teacher or admin role
        $this->authorizeSchoolMember($request, $school);

        $request->validate([
            'file'  => ['required', 'file', 'mimes:pdf,txt,text', 'max:10240'], // 10 MB
            'title' => ['nullable', 'string', 'max:255'],
        ]);

        $uploadedFile = $request->file('file');
        $title = $request->input('title', $uploadedFile->getClientOriginalName());

        // Store file (local disk for dev/test; override with S3 in prod env)
        $path = $uploadedFile->store("schools/{$school->id}/documents", 'local');

        $document = Document::create([
            'school_id'       => $school->id,
            'user_id'         => $request->user()->id,
            'title'           => $title,
            'content_hash'    => hash_file('sha256', $uploadedFile->getRealPath()),
            'storage_path'    => $path,
            'embedding_model' => 'text-embedding-3-small',
            'status'          => 'queued',
        ]);

        IngestDocument::dispatch($document->id);

        return response()->json([
            'document_id' => $document->id,
            'status'      => 'queued',
        ], 202);
    }

    /**
     * Poll document ingestion status.
     * GET /api/v1/schools/{school}/documents/{document}
     * Returns: {id, title, status, ingested_at}
     */
    public function show(Request $request, School $school, Document $document): JsonResponse
    {
        // Ensure document belongs to this school (tenant isolation)
        abort_if($document->school_id !== $school->id, 404);

        $this->authorizeSchoolMember($request, $school);

        return response()->json([
            'id'          => $document->id,
            'title'       => $document->title,
            'status'      => $document->status,
            'ingested_at' => $document->ingested_at?->toISOString(),
        ]);
    }

    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------

    private function authorizeSchoolMember(Request $request, School $school): void
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        // Platform admins pass through
        if ($user->role === 'platform_admin') {
            return;
        }

        $membership = $school->memberships()
            ->where('user_id', $user->id)
            ->whereIn('role', ['admin', 'teacher'])
            ->first();

        abort_unless($membership !== null, 403);
    }
}
