import { graphql as _graphql, buildSchema, } from 'graphql';
// @ts-ignore
import { addDirectiveResolveFunctionsToSchema } from './graphql-directives.mjs';
// ##################################################################################################
function buildSchemaWithResolvers(resolverMap, schemaString, directives) {
    const schema = buildSchema(schemaString);
    for (const typeName of Object.keys(resolverMap)) {
        const type = schema.getType(typeName);
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
export async function graphql(args) {
    const realArgs = {
        ...args,
        schema: buildSchemaWithResolvers(args.handlers, args.schema, args.directives),
    };
    return _graphql(realArgs);
}
export function gql(chunks, ...variables) {
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
//# sourceMappingURL=index.mjs.map