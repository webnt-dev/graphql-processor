// https://github.com/smooth-code/graphql-directive/blob/master/src/addDirectiveResolveFunctionsToSchema.js
// cannot be imported as module....
/* eslint-disable */
import { getNamedType, GraphQLSchema, isObjectType, defaultFieldResolver } from 'graphql';
import * as graphqlLanguage from 'graphql/language';
import * as graphqlType from 'graphql/type';
import { getDirectiveValues } from 'graphql/execution';

function forEachField(schema, fn) {
	const typeMap = schema.getTypeMap();

	for (const typeName in typeMap) {
		const type = typeMap[typeName];

		// TOD O: maybe have an option to include these?
		if (!getNamedType(type).name.startsWith('__') && isObjectType(type)) {
			const fields = type.getFields();
			for (const fieldName in fields) {
				const field = fields[fieldName];
				fn(field, typeName, fieldName);
			}
		}
	}
}


const DirectiveLocation =
	graphqlLanguage.DirectiveLocation || graphqlType.DirectiveLocation

const BUILT_IN_DIRECTIVES = ['deprecated', 'skip', 'include']

function getFieldResolver(field) {
	const resolver = field.resolve || defaultFieldResolver
	return resolver.bind(field)
}

function createAsyncResolver(field) {
	const originalResolver = getFieldResolver(field)
	return async (source, args, context, info) =>
		originalResolver(source, args, context, info)
}

function getDirectiveInfo(directive, resolverMap, schema, location, variables) {
	const name = directive.name.value

	const Directive = schema.getDirective(name)
	if (typeof Directive === 'undefined') {
		throw new Error(
			`Directive @${name} is undefined. ` +
			'Please define in schema before using.',
		)
	}

	if (!Directive.locations.includes(location)) {
		throw new Error(
			`Directive @${name} is not marked to be used on "${location}" location. ` +
			`Please add "directive @${name} ON ${location}" in schema.`,
		)
	}

	const resolver = resolverMap[name]
	if (!resolver) {
		throw new Error(
			`Directive @${name} has no resolver.` +
			'Please define one using createFieldExecutionResolver().',
		)
	}

	const args = getDirectiveValues(Directive, { directives: [directive] }, variables)
	return { args, resolver }
}

function filterCustomDirectives(directives) {
	return directives.filter(directive => !BUILT_IN_DIRECTIVES.includes(directive.name.value))
}

function createFieldExecutionResolver(field, resolverMap, schema) {
	const directives = filterCustomDirectives(field.astNode.directives)
	if (!directives.length) return getFieldResolver(field)
	return directives.reduce((recursiveResolver, directive) => {
		const directiveInfo = getDirectiveInfo(
			directive,
			resolverMap,
			schema,
			DirectiveLocation.FIELD_DEFINITION,
		)
		return (source, args, context, info) => directiveInfo.resolver(
			() => recursiveResolver(source, args, context, info),
			source,
			directiveInfo.args,
			context,
			info,
			args,
		)
	}, createAsyncResolver(field))
}

function createFieldResolver(field, resolverMap, schema) {
	const originalResolver = getFieldResolver(field)
	const asyncResolver = createAsyncResolver(field)
	return (source, args, context, info) => {
		const directives = filterCustomDirectives(info.fieldNodes[0].directives)
		if (!directives.length) return originalResolver(source, args, context, info)
		const fieldResolver = directives.reduce((recursiveResolver, directive) => {
			const directiveInfo = getDirectiveInfo(
				directive,
				resolverMap,
				schema,
				DirectiveLocation.FIELD,
				info.variableValues,
			)
			return () =>
				directiveInfo.resolver(
					() => recursiveResolver(source, args, context, info),
					source,
					directiveInfo.args,
					context,
					info,
					args,
				)
		}, asyncResolver)

		return fieldResolver(source, args, context, info)
	}
}

function addDirectiveResolveFunctionsToSchema(schema, resolverMap) {
	if (typeof resolverMap !== 'object') {
		throw new Error(
			`Expected resolverMap to be of type object, got ${typeof resolverMap}`,
		)
	}

	if (Array.isArray(resolverMap)) {
		throw new Error('Expected resolverMap to be of type object, got Array')
	}

	forEachField(schema, field => {
		field.resolve = createFieldExecutionResolver(field, resolverMap, schema)
		field.resolve = createFieldResolver(field, resolverMap, schema)
	})
}

export {
	addDirectiveResolveFunctionsToSchema
}

/* eslint-enable */
