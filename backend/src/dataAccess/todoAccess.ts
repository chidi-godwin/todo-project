import * as AWSXRAY from 'aws-xray-sdk'
import { DeleteItemCommand, DeleteItemCommandInput, DynamoDBClient, PutItemCommand, PutItemCommandInput, QueryCommand, QueryCommandInput, UpdateItemCommand, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb'
import { TodoItem } from 'src/models/TodoItem'
import { TodoUpdate } from 'src/models/TodoUpdate';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand, PutObjectCommandInput } from "@aws-sdk/client-s3";

const XDBClient = AWSXRAY.captureAWSv3Client(new DynamoDBClient({region: 'us-east-1'}))
const XS3Client = AWSXRAY.captureAWSv3Client(new S3Client({ region: 'us-east-1'}))

export class TodoAccess {
    constructor (
        private readonly client: DynamoDBClient = XDBClient,
        private readonly todoTable = process.env.TODO_TABLE,
        private readonly s3Client: S3Client = XS3Client,
        private readonly todoBucket = process.env.TODO_BUCKET,
        private readonly urlExpiration = process.env.SIGNED_URL_EXPIRATION,
        private readonly indexName = process.env.INDEX_NAME
    ) {}

    async getAllTodo(userId: string, sort: string): Promise<TodoItem[]> {
        console.log('Fetching all todos');

        const params: QueryCommandInput = {
            TableName: this.todoTable,
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': {'S': userId} 
            },
            ScanIndexForward: false
        }

        if ( sort === 'true') {
            params['IndexName'] = this.indexName
        }

        const result = await this.client.send(new QueryCommand(params));
        const items = result.Items
        console.log(items)

        return items as TodoItem[]
    }

    async createTodo(todo: TodoItem): Promise<TodoItem> {
        console.log('Creating a new todo')

        const params: PutItemCommandInput = {
            TableName: this.todoTable,
            Item: todo
        }
        const result = await this.client.send(new PutItemCommand(params));
        console.log(result)
        
        return todo
    }

    async updateTodo ( update: TodoUpdate, todoId: string, userId: string): Promise<TodoUpdate> {
        console.log('Updating todo');

        const params: UpdateItemCommandInput = {
            TableName: this.todoTable,
            Key: {
                userId: { S: userId },
                todoId: { S: todoId }
            },
            UpdateExpression: 'SET task = :task, dueDate = :dueDate, done = :done',
            ExpressionAttributeValues: {
                ':task' : update.task,
                ':dueDate': update.dueDate,
                ':done': update.done
            },
            ReturnValues: 'ALL_NEW'
        }

        const result = await this.client.send(new UpdateItemCommand(params));
        console.log(result)

        return result.Attributes as TodoUpdate
    }

    async deleteTodo(todoId: string, userId: string): Promise<void> {
        console.log('deleting todo');

        const params: DeleteItemCommandInput = {
            TableName: this.todoTable,
            Key: {
                userId: { S: userId },
                todoId: { S: todoId }
            }
        }

        await this.client.send(new DeleteItemCommand(params));
        return
    }

    async generateUplaodUrl(todoId: string): Promise<string> {
        console.log('Generating Url')

        const params: PutObjectCommandInput = {
            Bucket: this.todoBucket,
            Key: todoId
        }

        const command = new PutObjectCommand(params);
        const url: string = await getSignedUrl(this.s3Client, command, {expiresIn: parseInt(this.urlExpiration)})

        return url
    }
}
