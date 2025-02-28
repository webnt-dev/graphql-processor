import { describe, it, after, before } from 'node:test';
import assert, { deepEqual } from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { gql, GraphQLDirectiveHandler, graphql, GraphQLHandler } from './../src/index.mts';
import { strictEqual } from 'node:assert';
import { GraphQLError } from 'graphql';


// GraphQL schema definition
const personSchema = gql`
	# directives are evaluated from right to left
	directive @role(role: [String!]!) on FIELD_DEFINITION
	directive @upper on FIELD

	type Person {
		id: ID!
		idAddress: ID
		name: String!
		surname: String!
		fullName: String!
	}

	input CreatePerson {
		idAddress: ID
		name: String!
		surname: String!
	}

	input ListPeople {
		count: Int!
		start: Int!
	}

	type Query {
		countPeople: Int!
		getPerson(id: ID!): Person
		listPeople(data: ListPeople): [Person!]!
	}

	type Mutation {
		createPerson(data: CreatePerson!): ID!
		deletePerson(id: ID!): Boolean! @role(role:["ADMIN", "SUPER"])
	}

	schema {
		query: Query,
		mutation: Mutation
	}
`;

interface Person {
	id: string;
	idAddress: string | null;
	name: string;
	surname: string;
}

interface PersonResult extends Partial<Person> {
	fullName?: string;
}

interface CreatePerson {
	idAddress: string | null;
	name: string;
	surname: string;
}

interface ListPeople {
	count: number;
	start: number;
}

const peopleList: Person[] = [
	{
		id: "983a896f-efe6-4036-97df-542bbadccb95",
		idAddress: "a4ac4c57-a6c2-40d2-8ce3-d90de6f20c7e",
		name: "John",
		surname: "Doe",
	},
	{
		id: "8fc9fd98-dd1a-42f8-bfcd-0827f6fcaafc",
		idAddress: null,
		name: "Bronislav",
		surname: "Klučka",
	},
	{
		id: "49bb4f0f-fe26-4a9a-844a-9a8ffb959afe",
		idAddress: null,
		name: "Jane",
		surname: "Doe",
	},
	{
		id: "989243f3-d6bd-496d-94f4-898ca0ceb9f2",
		idAddress: null,
		name: "Some",
		surname: "Name",
	},
];

/*
Handlers for schema types in form

  Typename: {
	   fieldname(obj: unknown, args: unknown, context: unknown, info: unknown): string {
		}
	}

obj - The previous object, which for a field on the root Query type is often not used.
args - The arguments provided to the field in the GraphQL query.
context - A value which is provided to every resolver and holds important contextual information like the currently logged in user, or access to a database.
info - A value which holds field-specific information relevant to the current qu

*/
const personHandlers: GraphQLHandler = {
	Person: {
		/**
		 * How is Person.fullname resolved
		 * @param obj Person parent object
		 * @param args any arguments of fullName field (none)
		 * @param context any global context passed throung all resolvers
		 * @param info any GraphQL informations (field definitions, graphql schema, etc.)
		 * @returns string
		 */
		fullName(obj: Person, args: any, context: any, info: any): string {
			return `${obj.surname} ${obj.name}`;
		}
	},
	Query: {
		/**
		 * Returns number of people
		 * @param obj any NULL or rootValue from graphql function call
		 * @returns number
		 */
		countPeople(obj: any, args: any, context: any, info: any): number {
			return peopleList.length;
		},

		/**
		 * Implemented as Promise as example, hanler function can be sync or async... does not matter
		 *
		 * if function throws an error, graphQL error is returned as result
		 *
		 * @param args { id: string } list of parameters for function
		 */
		async getPerson(obj: any, args: { id: string }, context: any, info: any): Promise<Person | null> {

			if (!args.id) {
				throw new GraphQLError("Missing ID", {
					extensions: {
						code: "ID_MISSING",
					},
				});
			}

			return new Promise((resolve) => {
				setTimeout(() => {
					let person = peopleList.find((value) => value.id === args.id) ?? null;
					if (person !== null && obj !== null) {
						person = {
							...person,
							...obj
						}
					}
					resolve(person);
				}, 100)
			})
		},

		listPeople(obj: any, args: { data: { count: number, start: number } }, context: any, info: any): Person[] {
			return structuredClone(peopleList).slice(args.data.start, args.data.start + args.data.count);
		},

	},

	Mutation: {
		createPerson(obj: any, args: { data: CreatePerson }, context: any, info: any): string {
			if (args.data.name.trim() === '' || args.data.surname.trim() === '') {
				throw new GraphQLError("Missing name or surname", {
					extensions: {
						code: "DATA_MISSING",
					},
				});
			}
			const id = randomUUID();
			peopleList.push({
				...args.data,
				id
			});
			return id;
		},

		deletePerson(obj: any, args: { id: string }, context: any, info: any): boolean {
			const index = peopleList.findIndex((value) => value.id === args.id);
			if (index > -1) {
				peopleList.splice(index, 1);
			}
			return index > -1;
		},
	}
}

/*
Handlers for schema directives

  Typename: {
	   fieldname(resolve: ()=>unknown, obj: unknown, args: unknown, context: unknown, info: unknown, functionArgs: unknown): unknown {
		}
	}

resolve - handler to evaluate field, can be called directly, parameters are already bound to it
obj - The previous object, which for a field on the root Query type is often not used.
args - The arguments provided to the directive in the GraphQL query.
context - A value which is provided to every resolver and holds important contextual information like the currently logged in user, or access to a database.
info - A value which holds field-specific information relevant to the current qu
functionArgs - The arguments provided to the field in the GraphQL query.
*/

const personDirectives: GraphQLDirectiveHandler = {
	/**
	 * Authorization function, first check the role that guards the field against context role
	 *
	 * context can be prepared ahead of GraphQL evaluation (e.g. check Bearer token in HTTP request, setup
	 * the context object and pass it through graphql function)
	 *
	 * context object can be modified in functions, such modification is carried through all resolvers (directive or field)
	 */
	role(resolve: ()=>any, obj: any, args: any, context: any, info: any, functionArgs: any): Promise<any> {
		if (!args.role.includes(context.role)) {
			throw new GraphQLError("Unauthorized", {
				extensions: {
					code: "E_ROLE",
				},
			});
		}
		const result = resolve();

		return result;
	},

	/**
	 * directive can modify result
	 */
	async upper(resolve: ()=>any, obj: any, args: any, context: any, info: any, functionArgs: any): Promise<string> {
		const result = await resolve();
		return result.toString().toUpperCase();
	}
}


describe('GraphQL test', async () => {
	await describe('basic GraphQL (handlers/schema/source)', () => {
		describe('query', () => {
			it('countPeople should return 4', async () => {
				const result = await graphql({
					handlers: personHandlers,
					schema: personSchema,
					source: gql`
						query {
							countPeople
						}
					`,
				});
				assert(result.data!.countPeople === 4);
			});

			it('getPerson should return null', async () => {
				const result = await graphql({
					handlers: personHandlers,
					schema: personSchema,
					source: gql`
						query {
							getPerson(id: "AAA") {
								name
								idAddress
							}
						}
					`,
				});
				assert(
					result.data!.getPerson === null
				);
			});

			it('getPerson should return Bronislav', async () => {
				const result = await graphql({
					handlers: personHandlers,
					schema: personSchema,
					source: gql`
						query {
							getPerson(id: "8fc9fd98-dd1a-42f8-bfcd-0827f6fcaafc") {
								name
								idAddress
							}
						}
					`,
				});
				assert(
					(result.data!.getPerson as PersonResult).name === "Bronislav" &&
					(result.data!.getPerson as PersonResult).idAddress === null
				);
			});

			it('fullName should return Klučka Bronislav', async () => {
				const result = await graphql<{getPerson: PersonResult}>({
					handlers: personHandlers,
					schema: personSchema,
					source: gql`
						query {
							getPerson(id: "8fc9fd98-dd1a-42f8-bfcd-0827f6fcaafc") {
								fullName
							}
						}
					`,
				});
				assert(
					result.data!.getPerson.fullName === "Klučka Bronislav"
				);
			});

			it('listPeople should return Bronislav and Jane', async () => {
				const result = await graphql<{listPeople: PersonResult[]}>({
					handlers: personHandlers,
					schema: personSchema,
					source: gql`
						query {
							listPeople(data: { start: 1, count: 2}) {
								name
							}
						}
					`,
				});
				assert(
					result.data!.listPeople[0].name === "Bronislav" &&
					result.data!.listPeople[1].name === "Jane"
				);
			});

			it('returns error on missing ID', async () => {
				const result = await graphql<{getPerson: PersonResult}>({
					handlers: personHandlers,
					schema: personSchema,
					source: gql`
						query {
							getPerson(id: "") {
								fullName
							}
						}
					`,
				});
				assert(
					result.errors![0].extensions.code === 'ID_MISSING'
				);
			});
		});


		describe('mutation', async () => {
			it('create new person', async () => {
				let newId: string;
				const result = await graphql<{createPerson: string}>({
					handlers: personHandlers,
					schema: personSchema,
					source: gql`
						mutation {
							createPerson(data: { name: "test", surname: "testic" })
						}
					`,
				});
				newId = result.data!.createPerson;
				assert.match(
					newId,
					/^[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-4[A-Fa-f0-9]{3}-[89abAB][A-Fa-f0-9]{3}-[A-Fa-f0-9]{12}$/
				);
			})
		});
	});

	describe('advanced GraphQL', () => {
		it('operation name', async () => {
			const result = await graphql<{getPerson: PersonResult}>({
				handlers: personHandlers,
				schema: personSchema,
				source: gql`
					query getBronislav {
						getPerson(id: "8fc9fd98-dd1a-42f8-bfcd-0827f6fcaafc") {
							name
						}
					}

					query getJohn {
						getPerson(id: "983a896f-efe6-4036-97df-542bbadccb95") {
							fullName
						}
					}
				`,
				operationName: "getJohn",
			});
			assert(result.data!.getPerson.fullName === "Doe John");
		});

		it('variables', async () => {
			const result = await graphql<{getPerson: PersonResult}>({
				handlers: personHandlers,
				schema: personSchema,
				source: gql`
					query getJohn($jid: ID!) {
						getPerson(id: $jid) {
							fullName
						}
					}
				`,
				variableValues: {
					jid: "983a896f-efe6-4036-97df-542bbadccb95",
				},
			});
			assert(result.data!.getPerson.fullName === "Doe John");
		});

		it('operation name, variables', async () => {
			const result = await graphql<{getPerson: PersonResult}>({
				handlers: personHandlers,
				schema: personSchema,
				source: gql`
					query getBronislav($bid: ID!) {
						getPerson(id: $bid) {
							name
						}
					}

					query getJohn($jid: ID!) {
						getPerson(id: $jid) {
							fullName
						}
					}
				`,
				variableValues: {
					bid: "8fc9fd98-dd1a-42f8-bfcd-0827f6fcaafc",
					jid: "983a896f-efe6-4036-97df-542bbadccb95",
				},
				operationName: "getJohn",
			});
			assert(result.data!.getPerson.fullName === "Doe John");
		});

		it('root value', async () => {
			const result = await graphql<{getPerson: PersonResult}>({
				handlers: personHandlers,
				schema: personSchema,
				source: gql`
					query getBronislav($bid: ID!) {
						getPerson(id: $bid) {
							fullName
						}
					}
				`,
				variableValues: {
					bid: "8fc9fd98-dd1a-42f8-bfcd-0827f6fcaafc",
				},
				rootValue: {
					surname: 'Smith'
				}
			});
			assert(result.data!.getPerson.fullName === "Smith Bronislav");
		});

	});


	await describe('directives', () => {

		it('delete should not work - missing role', async () => {
			const result = await graphql<{deletePerson: boolean}>({
				handlers: personHandlers,
				schema: personSchema,
				directives: personDirectives,
				source: gql`
					mutation deletePerson($id: ID!) {
						deletePerson(id: $id)
					}
				`,
				variableValues: {
					id: "989243f3-d6bd-496d-94f4-898ca0ceb9f2",
				},
				contextValue: {
					role: 'USER',
				}
			});
			assert(result.errors![0].extensions.code === 'E_ROLE');
		});

		it('delete should work - role directive, context', async () => {
			const result = await graphql<{deletePerson: boolean}>({
				handlers: personHandlers,
				schema: personSchema,
				directives: personDirectives,
				source: gql`
					mutation deletePerson($id: ID!) {
						deletePerson(id: $id)
					}
				`,
				variableValues: {
					id: "989243f3-d6bd-496d-94f4-898ca0ceb9f2",
				},
				contextValue: {
					role: 'ADMIN',
				}
			});
			assert(result.data!.deletePerson);
		});

		it('getPerson should return BRONISLAV', async () => {
			const result = await graphql({
				handlers: personHandlers,
				schema: personSchema,
				directives: personDirectives,
				source: gql`
					query {
						getPerson(id: "8fc9fd98-dd1a-42f8-bfcd-0827f6fcaafc") {
							name @upper
						}
					}
				`,
			});
			assert(
				(result.data!.getPerson as PersonResult).name === "BRONISLAV"
			);
		});
	});
});
