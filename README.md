<div align="center">

# AutoMates.js

</div>

Project for the "Autonomous Software Agents" course at University of Trento.

## Installation and Execution
Follow these steps to install dependencies and start the project:

1. Clone the repository:
   ```sh
   git clone https://github.com/Frasor2002/AutoMates.js.git
   cd AutoMates.js
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Start the project: 
   - If the environment variables  are in a .env file the command is:
   ```sh
   npm run dev
   ```
   - If the environment variables are set directly use the following command to run the project:
   ```sh
   npm run start
   ```

## Configuration

To run the project some mandatory parameters must be set.

The necessary parameters are:

1. `HOST`: the host (in the form `http://<host>:<port>`) of the server running the environment.
2. `TOKEN`: the token used to identify the agent.
3. `USE_PDDL`: set to "true" if PDDL is used for plans or not, by default Astar is used.
4. `LOGGER`: set to "true" if we want to activate the logger, a '.logs' folder must be created.
5. `MODE`: set to "multi" if we want to run the multiagent system.
6. `SECRET_KEY`: set key to encrypt first shouted handshake message.
