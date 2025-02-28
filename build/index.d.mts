import { GraphQLArgs as _GraphQLArgs, ExecutionResult } from 'graphql';
type HandlerFunction = (obj: any, args: any, context: any, info: any) => unknown;
type AsyncHandlerFunction = (obj: any, args: any, context: any, info: any) => Promise<unknown>;
type DirectiveFunction = (resolve: () => any, obj: any, args: any, context: any, info: any, functionArgs: any) => unknown;
type AsyncDirectiveFunction = (resolve: () => any, obj: any, args: any, context: any, info: any, functionArgs: any) => Promise<unknown>;
export interface GraphQLHandler {
    [key: string]: {
        [functionName: string]: HandlerFunction | AsyncHandlerFunction;
    };
}
export interface GraphQLDirectiveHandler {
    [functionName: string]: DirectiveFunction | AsyncDirectiveFunction;
}
export interface GraphQLArgs extends Omit<_GraphQLArgs, 'schema' | 'fieldResolver' | 'typeResolver'> {
    handlers: GraphQLHandler;
    schema: string;
    directives?: GraphQLDirectiveHandler;
}
export declare function graphql(args: GraphQLArgs): Promise<ExecutionResult>;
export declare function graphql<TData>(args: GraphQLArgs): Promise<ExecutionResult<TData>>;
export declare function gql(chunks: TemplateStringsArray, ...variables: any[]): string;
export {};
/**
 resolvers
human(obj, args, context, info)
obj The previous object, which for a field on the root Query type is often not used.
args The arguments provided to the field in the GraphQL query.
context A value which is provided to every resolver and holds important contextual information like the currently logged in user, or access to a database.
info A value which holds field-specific information relevant to the current query as well as the schema details, also refer to type GraphQLResolveInfo for more details.
 */
//# sourceMappingURL=index.d.mts.map