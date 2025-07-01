const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const app = express();
const Blog = require("./models/blogs");

const PORT = process.env.PORT || 3001;

const errorHandler = (error, request, response, next) => {
  console.error(error.message);

  if (error.name === "CastError") {
    return response.status(400).send({ error: "malformatted id" });
  } else if (error.name === "ValidationError") {
    const errorMessages = Object.values(error.errors).map((err) => err.message);
    return response.status(400).json({ error: errorMessages.join(" ") }); // Custom error response
  }

  next(error);
};

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: "unknown endpoint" });
};

app.use(express.static("dist"));
app.use(cors());
app.use(express.json());
morgan.token("body", (req) => JSON.stringify(req.body));
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms :body")
);

app.get("/api/blogs", (request, response) => {
  Blog.find({}).then((result) => {
    response.json(result);
  });
});

app.get("/api/blogs/:id", (request, response, next) => {
  Blog.findById(request.params.id)
    .then((blog) => {
      if (blog) {
        response.json(blog);
      } else {
        response.status(404).end();
      }
    })
    .catch((error) => next(error));
});

app.delete("/api/blogs/:id", (request, response, next) => {
  Blog.findByIdAndDelete(request.params.id)
    .then(() => {
      response.status(204).end();
    })
    .catch((error) => next(error));
});

app.post("/api/blogs", (request, response, next) => {
  const body = request.body;

  if (!body.title) {
    return response.status(400).json({ error: "Title missing" });
  }

  if (!body.author) {
    return response.status(400).json({ error: "Author missing" });
  }

  const blog = new Blog({
    title: body.title,
    author: body.author,
    url: body.url,
    likes: body.likes,
  });

  blog
    .save()
    .then((savedBlog) => {
      response.json(savedBlog);
    })
    .catch((error) => next(error));
});

// New PUT endpoint to handle updates
app.put("/api/blogs/:id", (request, response, next) => {
  const body = request.body;

  if (!body.title || !body.author) {
    return response.status(400).json({
      error: "Title or Author missing",
    });
  }

  const blog = {
    title: body.title,
    author: body.author,
    url: body.url,
    likes: body.likes,
  };

  Blog.findByIdAndUpdate(request.params.id, blog, {
    new: true,
    runValidators: true,
    context: "query",
  })
    .then((updatedBlog) => {
      if (updatedBlog) {
        response.json(updatedBlog);
      } else {
        response.status(404).end();
      }
    })
    .catch((error) => next(error));
});

app.get("/info", (request, response) => {
  Blog.countDocuments({}).then((count) => {
    const currentDate = new Date();
    response.send(`
        <p>There are ${count} blogs.</p>
        <p>${currentDate}</p>
      `);
  });
});

app.use(unknownEndpoint);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});