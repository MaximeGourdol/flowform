# @flowform/adapter-core

Turns a native validation schema into a `Validator` for
[`@flowform/core`](../core). You pass the schema you already wrote — Zod, Yup,
Joi, Ajv, class-validator, or anything implementing
[Standard Schema](https://github.com/standard-schema/standard-schema) — and the
provider is detected at runtime.

## Install

```bash
pnpm add @flowform/adapter-core @flowform/core
```

The validation libraries are optional peer dependencies: install only the one
you use.

## Usage

```ts
import { toValidator } from '@flowform/adapter-core';
import { z } from 'zod';

const validate = toValidator(
  z.object({ email: z.string().email('Invalid email') }),
);

await validate({ email: 'nope' }); // { email: ['Invalid email'] }
await validate({ email: 'a@b.co' }); // {}
```

The result is a plain `Validator`, so it drops straight into a step:

```ts
createForm({
  initialValues,
  steps: [{ id: 'account', validate: toValidator(schema) }],
});
```

## Supported schemas

| Provider              | Passed as                                         | Detection                                     |
| --------------------- | ------------------------------------------------- | --------------------------------------------- |
| Zod, Valibot, ArkType | the schema object                                 | Standard Schema (`~standard`)                 |
| Yup                   | `yup.object(...)`                                 | `__isYupSchema__`                             |
| Joi                   | `Joi.object(...)`                                 | `$_root`                                      |
| Ajv                   | a compiled validate function (`ajv.compile(...)`) | function with `.schema` / `.errors`           |
| class-validator       | the DTO class itself                              | a class constructor with decorated properties |

Errors from every provider are normalized to the core's `ErrorMap` shape —
`{ 'path.to.field': ['message', ...] }` — with nested paths as dot notation and
array indices as numeric segments.

## Options

```ts
toValidator(schema, {
  abortEarly: false, // stop at the first error (where the provider supports it)
  paths: ['email'], // only keep errors under these paths
});
```

Zod, Valibot, ArkType, and Yup carry their output type through, so
`toValidator(schema)` returns a `Validator<InferValues<typeof schema>>`. For Joi,
Ajv, and class-validator pass the values type explicitly:
`toValidator<MyValues>(schema)`.

## License

MIT
