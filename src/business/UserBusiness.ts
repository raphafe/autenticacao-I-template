import { UserDatabase } from "../database/UserDatabase"
import { GetUsersInputDTO, GetUsersOutputDTO } from "../dtos/user/getUsers.dto"
import { LoginInputDTO, LoginOutputDTO } from "../dtos/user/login.dto"
import { SignupInputDTO, SignupOutputDTO } from "../dtos/user/signup.dto"
import { BadRequestError } from "../errors/BadRequestError"
import { NotFoundError } from "../errors/NotFoundError"
import { USER_ROLES, User } from "../models/User"
import { IdGenerator } from "../services/idGenerator"
import { TokenManager, TokenPayload } from "../services/tokenManager"

export class UserBusiness {
  constructor(
    private userDatabase: UserDatabase,
    private idGenerator: IdGenerator,
    private tokenManger: TokenManager
  ) { }

  public getUsers = async (
    input: GetUsersInputDTO
  ): Promise<GetUsersOutputDTO> => {
    const { q } = input

    const usersDB = await this.userDatabase.findUsers(q)

    const users = usersDB.map((userDB) => {
      const user = new User(
        userDB.id,
        userDB.name,
        userDB.email,
        userDB.password,
        userDB.role,
        userDB.created_at
      )

      return user.toBusinessModel()
    })

    const output: GetUsersOutputDTO = users

    return output
  }

  public signup = async (
    input: SignupInputDTO
  ): Promise<SignupOutputDTO> => {
    const { 
      // id, 
      name, 
      email, 
      password 
    } = input

    const id = this.idGenerator.generate()

    // Por ser aplicação pequena, as chances de haver um repetido é nulo

    // const userDBExists = await this.userDatabase.findUserById(id)

    // if (userDBExists) {
    //   throw new BadRequestError("'id' já existe")
    // }

    const newUser = new User(
      id,
      name,
      email,
      password,
      USER_ROLES.NORMAL, // só é possível criar users com contas normais
      new Date().toISOString()
    )

    const newUserDB = newUser.toDBModel()
    await this.userDatabase.insertUser(newUserDB)

    // cria o objeto e acessa ele
    const tokenPayload : TokenPayload = {
      id: newUser.getId(),
      name: newUser.getName(), 
      role: newUser.getRole()
    }

    const token = this.tokenManger.createToken(tokenPayload)

    const output: SignupOutputDTO = {
      message: "Cadastro realizado com sucesso",
      token: token
    }

    return output
  }

  public login = async (
    input: LoginInputDTO
  ): Promise<LoginOutputDTO> => {
    const { email, password } = input

    const userDB = await this.userDatabase.findUserByEmail(email)

    if (!userDB) {
      throw new NotFoundError("'email' não encontrado")
    }

    if (password !== userDB.password) {
      throw new BadRequestError("'email' ou 'password' incorretos")
    }

    const tokenPayload : TokenPayload = {
      id: userDB.id,
      name: userDB.name, 
      role: userDB.role
    }

    const token = this.tokenManger.createToken(tokenPayload)

    const output: LoginOutputDTO = {
      message: "Login realizado com sucesso",
      token: token
    }

    return output
  }
}