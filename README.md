Package allows for simple GraphQL scheme definition, field handler functions and field directive functions.

Following code showcases
- definition of GraphQL schema in `schema` constant
- definition of GraphQL field handlers in `handlers` constant
- definition of GraphQL directives handlers in `directives` constant

see below for more secription

See [tests](./blob/main/test/index.mts) for more detailed examples!

```TypeScript
import { gql, GraphQLDirectiveHandler, graphql, GraphQLHandler } from '@webnt-dev/graphql-processor';
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

const handlers: GraphQLHandler = {
	Person: {
		fullname(obj: Person): string {
			return `${obj.surname} ${obj.name}`;
		}
	},

	Query: {
		get(): Person {
			return person;
		}
	},
}


const directives: GraphQLDirectiveHandler = {
	role(resolve: ()=>any, obj: any, args: any, context: any): Promise<any> {
		if (args.role !== context.role) {
			throw new GraphQLError("Unauthorized", {
				extensions: {
					code: "E_ROLE",
				},
			});
		}
		return resolve();
	},

	async whatever(resolve: ()=>any): Promise<any> {
		return resolve();
	},

	async upper(resolve: ()=>any): Promise<string> {
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

```

## How are handlers executed (order):

1. get
2. fullname
3. upper
4. role
5. whatever

## Supported directives
Currently only `FIELD_DEFINITION` and `FIELD` directives are supported

## Field handler

Field handler are of type
```TypeScript
type HandlerFunction = (obj: any, args: any, context: any, info: GraphQLResolveInfo) => unknown;
type AsyncHandlerFunction = (obj: any, args: any, context: any, info: GraphQLResolveInfo) => Promise<unknown>;

// handler is of type
HandlerFunction | AsyncHandlerFunction
```

<dl>
  <dt><strong>obj</strong></dt>
  <dd>Parent object on which the handler function is called or `rootValue` parameter of `graphql` function (see <a href="./blob/main/test/index.mts">tests</a>) </dd>
	<dd>In this example, first `get` if called with `null` value and returns Person, this person is then `obj` for `fullname` handler.</dd>
</dl>



# Result
```json
{
  "data": {
    "get": {
      "name": "John",
      "surname": "Doe",
      "fullname": "Doe John",
      "secret": "123456789ABCD"
    }
  }
}
```
# Changelog

Any missing version means mostly documentation fixes.

## version 1.0.0
2025-02-28
```
+ initial version
```

## version 1.0.4
2023-05-13
```
+ initial version
```
