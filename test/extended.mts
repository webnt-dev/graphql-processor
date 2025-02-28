import { gql, GraphQLDirectiveHandler, graphql, GraphQLHandler } from '../src/index.mts';
import { GraphQLError } from 'graphql';


// GraphQL schema definition
const schema = gql`
	# directives are evaluated from right to left
	directive @whatever on FIELD_DEFINITION
	directive @role(role: String!) on FIELD_DEFINITION
	directive @upper on FIELD

	type Person {
		name: String!
		surname: String!
		fullname: String!
		secret: String! @whatever @role(role: "ADMIN")
	}
	type Query {
		get: Person!
	}

	schema {
		query: Query,
	}
`;

interface Person {
	name: string;
	surname: string;
	secret: string;
}

let person = {
	name: "John",
	surname: "Doe",
	secret: "123456789abcd",
}

function handleContext(name: string, obj: any, args: any, context: any, info: any) {
	context.extensions.stack.push({
		name,
		obj,
		args,
		// context,
		fieldName: info.fieldName,
		// info,
	});
	// console.log(context.extensions.stack);
}

const handlers: GraphQLHandler = {
	Person: {
		fullname(obj: Person, args: any, context: any, info: any): string {
			handleContext('fullname', obj, args, context, info);
			return `${obj.surname} ${obj.name}`;
		}
	},

	Query: {
		get(obj: any, args: any, context: any, info: any): Person {
			handleContext('get', obj, args, context, info);
			return person;
		}
	},
}


const directives: GraphQLDirectiveHandler = {
	role(resolve: ()=>any, obj: any, args: any, context: any, info: any, functionArgs: any): Promise<any> {
		handleContext('role', obj, args, context, info);
		if (args.role !== context.role) {
			throw new GraphQLError("Unauthorized", {
				extensions: {
					code: "E_ROLE",
				},
			});
		}
		return resolve();
	},

	async whatever(resolve: ()=>any, obj: any, args: any, context: any, info: any, functionArgs: any): Promise<any> {
		handleContext('whatever', obj, args, context, info);
		return resolve();
	},

	async upper(resolve: ()=>any, obj: any, args: any, context: any, info: any, functionArgs: any): Promise<string> {
		handleContext('upper', obj, args, context, info);
		const result = await resolve();
  	return result.toString().toUpperCase();
	},
}

const contextValue = {
	role: "ADMIN",
	extensions: {
		stack: []
	}
}

const result = await graphql({
	handlers,
	directives,
	schema,
	source: gql`
		query {
			get {
				name
				surname
				fullname
				secret @upper
			}
		}
	`,
	contextValue,
});

console.log(JSON.parse(JSON.stringify(result)));
console.log(contextValue.extensions.stack);
