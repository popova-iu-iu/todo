import React, { useState } from "react";
import cn from "classnames";

const TodoTask = ({ task, deleteTask }) => {
  const { id, text } = task;
  const [taskDone, setTaskDone] = useState(false);

  const toggleDone = () => {
    taskDone ? setTaskDone(false) : setTaskDone(true);
  };

  const deletCurrentTask = () => {
    deleteTask(id);
  };

  const checkboxClasses = cn({
    "task__checkbox-active": taskDone,
    "task__checkbox-default": !taskDone,
  });

  return (
    <div className="todo__task" key={id}>
      <i className={checkboxClasses} onClick={toggleDone}></i>
      <span className="todo__text">{text}</span>
      <i className="task__close" onClick={deletCurrentTask}></i>
    </div>
  );
};

export default TodoTask;
