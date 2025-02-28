import {
	graphql as _graphql, buildSchema, GraphQLObjectType, GraphQLArgs as _GraphQLArgs,
	ExecutionResult,
	GraphQLResolveInfo,
} from 'graphql';
// @ts-ignore
import { addDirectiveResolveFunctionsToSchema } from './graphql-directives.mjs';

// ##################################################################################################

function buildSchemaWithResolvers(resolverMap: any, schemaString: string, directives?: GraphQLDirectiveHandler) {
	const schema = buildSchema(schemaString);
	for (const typeName of Object.keys(resolverMap)) {
		const type = schema.getType(typeName) as GraphQLObjectType;
		const fields = type.getFields();
		const fieldsNames = Object.keys(fields);
		for (const fieldName of Object.keys(resolverMap[typeName])) {
			if (fieldsNames.includes(fieldName)) {
				fields[fieldName].resolve = resolverMap[typeName][fieldName];
			}
		}
	}
	if (directives) {
		addDirectiveResolveFunctionsToSchema(schema, directives);
	}
	return schema;
}

type HandlerFunction = (obj: any, args: any, context: any, info: GraphQLResolveInfo) => unknown;
type AsyncHandlerFunction = (obj: any, args: any, context: any, info: GraphQLResolveInfo) => Promise<unknown>;
type DirectiveFunction = (resolve: ()=>any, obj: any, args: any, context: any, info: GraphQLResolveInfo, functionArgs: any) => unknown;
type AsyncDirectiveFunction = (resolve: ()=>any, obj: any, args: any, context: any, info: GraphQLResolveInfo, functionArgs: any) => Promise<unknown>;


export interface GraphQLHandler {
	[key: string]: {
		[functionName: string]: HandlerFunction | AsyncHandlerFunction,
	}
}

export interface GraphQLDirectiveHandler {
	[functionName: string]: DirectiveFunction | AsyncDirectiveFunction,
}

export interface GraphQLArgs extends Omit<_GraphQLArgs, 'schema' | 'fieldResolver' | 'typeResolver' > {
	handlers: GraphQLHandler,
	schema: string,
	directives?: GraphQLDirectiveHandler,
}

export async function graphql(args: GraphQLArgs): Promise<ExecutionResult>;
export async function graphql<TData>(args: GraphQLArgs): Promise<ExecutionResult<TData>>;
export async function graphql<TData, TExtensions>(args: GraphQLArgs): Promise<ExecutionResult<TData, TExtensions>> {
	const realArgs: _GraphQLArgs = {
		...args,
		schema: buildSchemaWithResolvers(args.handlers, args.schema, args.directives),
	};
	return _graphql(realArgs) as Promise<ExecutionResult<TData, TExtensions>>;
}

export function gql(chunks: TemplateStringsArray, ...variables: any[]): string {
	return chunks.reduce((accumulator, chunk, index) => `${accumulator}${chunk}${index in variables ? variables[index] : ''}`, '');
}

/**
 resolvers
human(obj, args, context, info)
obj The previous object, which for a field on the root Query type is often not used.
args The arguments provided to the field in the GraphQL query.
context A value which is provided to every resolver and holds important contextual information like the currently logged in user, or access to a database.
info A value which holds field-specific information relevant to the current query as well as the schema details, also refer to type GraphQLResolveInfo for more details.
 */
