'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { kb } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { BtnPrimary, BtnSecondary, FieldLabel, Modal, TextArea, TextInput } from '@/components/ui/modal';
import { toast } from '@/lib/toast';

const emptyArticle = {
  title: '',
  slug: '',
  category: '',
  content: '',
  isPublic: false,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function KnowledgeBasePage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [article, setArticle] = useState(emptyArticle);

  const { data, isLoading } = useQuery({
    queryKey: ['kb'],
    queryFn: kb.list,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      kb.create({
        title: article.title,
        slug: article.slug || slugify(article.title),
        content: article.content,
        category: article.category || undefined,
        isPublic: article.isPublic,
      }),
    onSuccess: () => {
      toast.success('Article created');
      queryClient.invalidateQueries({ queryKey: ['kb'] });
      setArticle(emptyArticle);
      setShowCreate(false);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <BtnPrimary onClick={() => setShowCreate(true)}>New article</BtnPrimary>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data?.map((article) => (
            <article key={article.id} className="bg-card rounded-xl border border-border p-4">
              <h2 className="font-semibold">{article.title}</h2>
              {article.category && (
                <span className="text-xs text-muted-foreground">{article.category}</span>
              )}
              <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{article.content}</p>
              <p className="text-xs text-muted-foreground mt-2">Updated {formatDate(article.updatedAt)}</p>
            </article>
          ))}
          {!data?.length && (
            <p className="col-span-full p-8 text-center text-muted-foreground bg-card rounded-xl border border-border">
              No articles yet
            </p>
          )}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create knowledge article" wide>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <FieldLabel>Title</FieldLabel>
            <TextInput
              value={article.title}
              onChange={(event) => {
                const title = event.target.value;
                setArticle((current) => ({
                  ...current,
                  title,
                  slug: current.slug === slugify(current.title) || !current.slug ? slugify(title) : current.slug,
                }));
              }}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Slug</FieldLabel>
              <TextInput
                value={article.slug}
                onChange={(event) => setArticle((current) => ({ ...current, slug: slugify(event.target.value) }))}
                placeholder="printer-troubleshooting"
                required
              />
            </div>
            <div>
              <FieldLabel>Category</FieldLabel>
              <TextInput
                value={article.category}
                onChange={(event) => setArticle((current) => ({ ...current, category: event.target.value }))}
                placeholder="Hardware"
              />
            </div>
          </div>
          <div>
            <FieldLabel>Content</FieldLabel>
            <TextArea
              value={article.content}
              onChange={(event) => setArticle((current) => ({ ...current, content: event.target.value }))}
              className="min-h-48"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={article.isPublic}
              onChange={(event) => setArticle((current) => ({ ...current, isPublic: event.target.checked }))}
            />
            Public article
          </label>
          <div className="flex justify-end gap-2">
            <BtnSecondary type="button" onClick={() => setShowCreate(false)}>
              Cancel
            </BtnSecondary>
            <BtnPrimary type="submit" disabled={createMutation.isPending}>
              Create
            </BtnPrimary>
          </div>
        </form>
      </Modal>
    </div>
  );
}
