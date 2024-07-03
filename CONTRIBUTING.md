## Unit Test

`pnpm test`

## CT Test

1. Terminal 1: `pnpm watch`
2. Terminal 2: `pnpm storybook` (optional)
3. Terminal 3: `pnpm test:ct`

It may encounter some problems with playwright cache in step 3, you can try to delete the cache and run the command again:

```bash
rm -rf ./node_modules/.pw-cache && PWTEST_CACHE_DIR=./node_modules/.pw-cache pnpm test:ct
```
