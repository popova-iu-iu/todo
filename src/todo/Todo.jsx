import React, { useState } from "react";
import _ from "lodash";

import TodoForm from "./TodoForm";
import TodoTask from "./TodoTask";

const Todo = () => {
  const [todos, setTodos] = useState([]);

  const addTask = (userInput) => {
    if (userInput.length !== 0) {
      const todoItem = {
        id: _.uniqueId(),
        text: userInput,
      };
      setTodos([...todos, todoItem]);
    }
  };

  const deleteTask = (currentId) => {
    const newTodos = todos.filter((task) => task.id !== currentId);
    setTodos(newTodos);
  };

  return (
    <div className="todo">
      <div className="todo__header">My Todo</div>
      <div className="todo__body">
        <TodoForm addTask={addTask} />
        {todos.map((task) => {
          return <TodoTask task={task} key={task.id} deleteTask={deleteTask} />;
        })}
      </div>
    </div>
  );
};

export default Todo;
