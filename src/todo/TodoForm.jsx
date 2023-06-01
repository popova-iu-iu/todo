import React, { useState } from "react";

const TodoForm = ({ addTask }) => {
  const [userInput, setUserInput] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    addTask(userInput);
    setUserInput("");
  };

  const handleChange = (e) => {
    setUserInput(e.target.value);
  };

  return (
    <form className="todo__add-task" onSubmit={handleSubmit}>
      <input
        className="todo__input"
        type="text"
        placeholder="Enter task..."
        value={userInput}
        onChange={handleChange}
      />
      <button className="todo__button-primary" type="submit">
        Submit
      </button>
    </form>
  );
};

export default TodoForm;
