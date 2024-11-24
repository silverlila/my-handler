import { z } from "zod";

export type Middleware<
  Input extends z.ZodTypeAny,
  Context extends Record<string, any>
> = (props: {
  input: z.infer<Input>;
  context: Context;
}) => Promise<typeof props>;

export type HandlerProps<
  Input extends z.ZodTypeAny,
  Context extends Record<string, any>
> = {
  schema?: Input;
  context: Context;
  middleware: Middleware<Input, Context>[];
};

export class Container<Context extends Record<string, any>> {
  constructor(private context: Context) {}

  createHandler<I extends z.ZodTypeAny>(schema?: I) {
    return new Handler({
      schema: schema,
      context: this.context,
      middleware: [],
    });
  }
}

export class Handler<
  Input extends z.ZodTypeAny,
  Context extends Record<string, any>
> {
  private schema?: Input;
  private context: Context;
  private middlewares: Middleware<Input, Context>[];

  constructor(props: HandlerProps<Input, Context>) {
    this.schema = props.schema;
    this.context = props.context ?? {};
    this.middlewares = props.middleware;
  }

  private async processMiddlewares(input: z.infer<Input>) {
    let processedInput = input;
    for (const middleware of this.middlewares) {
      const result = await middleware({
        input: processedInput,
        context: this.context,
      });
      processedInput = result.input;
    }
    return processedInput;
  }

  use(middleware: Middleware<Input, Context>) {
    this.middlewares.push(middleware);
    return this;
  }

  execute<Output>(
    fn: (props: { input: z.infer<Input>; context: Context }) => Promise<Output>
  ) {
    return async (input?: z.infer<Input>) => {
      let processedInput = {};
      try {
        if (this.schema) {
          const validatedInput = await this.schema.parseAsync(input);
          processedInput = await this.processMiddlewares(validatedInput);
        }

        const result = await fn({
          input: processedInput,
          context: this.context,
        });
        return { ok: true, data: result, error: null };
      } catch (error) {
        console.error(error);
        return { ok: false, data: null, error: error };
      }
    };
  }
}
