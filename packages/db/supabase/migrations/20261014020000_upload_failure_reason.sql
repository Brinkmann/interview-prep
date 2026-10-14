-- AT-02: an unreadable CV shows a plain reason and a suggested alternative.
alter table public.uploads
  add column failure_reason text
    check (failure_reason in ('unreadable', 'unsupported_type', 'processing_error'));

-- CVs are PDF or Word documents of modest size; anything else is refused at upload.
update storage.buckets
  set file_size_limit = 10485760,
      allowed_mime_types = array['application/pdf',
                                 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  where id = 'cv-uploads';
