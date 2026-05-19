# Query And Mutations Pattern

Use this when adding write actions or migrating from mock fetchers to backend APIs.

## Query Pattern

```ts
const { data = [], isFetching } = useQuery({
  queryKey: ['tasks'],
  queryFn: fetchLogisticsTasks,
});
```

## Mutation Pattern

When backend exists:

```ts
const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: updateTaskProgress,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
  },
});
```

## Mutation UX

- Disable only the action being submitted.
- Keep the rest of the screen readable.
- Show validation errors near the relevant field.
- Show integration errors in Alert.
- Invalidate lists and details affected by the mutation.

## Mock Phase

If mocking mutation behavior:

- state that it is mock-only in code comments or docs.
- do not present SAP sync or closure as production behavior.
- keep mock data shape identical to future API shape where possible.
