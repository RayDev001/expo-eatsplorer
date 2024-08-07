import { BACKEND_URL, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '@env';

const CLIENT_ID = GITHUB_CLIENT_ID;
const CLIENT_SECRET = GITHUB_CLIENT_SECRET;

const BACKEND = BACKEND_URL;

const api = {
  users: {
    async login(user, password) {
      try {
        const response = await fetch(BACKEND + '/api/Acceso/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            correo: user.email,
            clave: password,
          }),
        });

        const result = await response.json();
        if (response.ok) {
          return result;
        } else {
          console.error('Login failed');
          return { isSuccess: false };
        }
      } catch (error) {
        console.error('Error logging user:', error);
        return { isSuccess: false };
      }
    },
    async register(user) {
      try {
        const response = await fetch(BACKEND + '/api/Acceso/Register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            usuario: user.username,
            correo: user.email,
            clave: user.password,
          }),
        });

        const result = await response.json();
        if (response.ok) {
          return result;
        } else {
          console.error('Registration failed:', result);
          return { isSuccess: false };
        }
      } catch (error) {
        console.error('Error registering user:', error);
        return { isSuccess: false };
      }
    },
    async authenticate(code) {
      try {
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code,
          }),
        });

        const tokenData = await tokenResponse.json();

        const userResponse = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `token ${tokenData.access_token}`,
          },
        });

        const userData = await userResponse.json();
        if (!userData.email) {
          const emailsResponse = await fetch('https://api.github.com/user/emails', {
            headers: {
              Authorization: `token ${tokenData.access_token}`,
            },
          });

          const emailsData = await emailsResponse.json();
          const primaryEmail = emailsData?.find((email) => email.primary && email.verified);
          if (primaryEmail) {
            userData.email = primaryEmail.email;
          }
        }

        return { user: userData, token: tokenData.access_token };
      } catch (error) {
        console.error('Error during authentication:', error);
      }
    },
    async exists(user) {
      try {
        const response = await fetch(BACKEND + '/api/Acceso/loginDirecto', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            correo: user.email,
          }),
        });

        const data = await response.json();
        if (response.ok) {
          return data;
        } else {
          console.error('Check user failed:', data);
          return data;
        }
      } catch (error) {
        console.error('Error checking user:', error);
        return { isSuccess: false };
      }
    },
    async findById(id, token) {
      try {
        const response = await fetch("https://api-eat.azurewebsites.net/api/Perfil/" + id, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          }
        })

        const result = await response.json();
        if (response.ok) {
          return {
            isSuccess: true,
            user: {
              id: id,
              username: result?.usuario?.usuario,
              description: result?.usuario?.descripcion,
              email: result?.usuario?.correo,
              recipesCount: result?.usuario?.cant_recetas_guardadas ?? 0,
              profileImage: result?.usuario?.url_foto_perfil,
              thumnailImage: result?.usuario?.url_foto_portada,
              likes: formatIngredients(result?.usuario?.gustos),
              dislikes: formatIngredients(result?.usuario?.noConsume),
              alergic: formatIngredients(result?.usuario?.alergico),
            }
          };
        } else {
          console.error('Find user failed:', result);
          return { isSuccess: false, user: {} };
        }
      } catch (e) {
        console.error("Network Error", e)
        return { isSuccess: false, user: {} };
      }
    },
    async changePassword(oldPassword, newPassword, token) {
      try {
        const response = await fetch(BACKEND + "/api/CambiarClave/cambiarClave", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            claveActual: oldPassword,
            nuevaClave: newPassword,
          }),
        })

        const result = await response.json();
        if (response.ok) {
          return {
            isSuccess: true,
          };
        } else {
          console.error('Find user failed:', result);
          return { isSuccess: false };
        }
      } catch (e) {
        console.error("Network Error", e)
        return { isSuccess: false };
      }
    },
    async loginGithub(code) {
      const URL = BACKEND + "/api/Acceso/github-callback"
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code
        }),
      };

      try {
        const response = await fetch(URL, options);
        const result = await response.json();

        if (!response.ok) {
          console.error(`Login failed: ${result.message || 'Unknown error'}`);
          return { isSuccess: false, message: result.message || 'Login failed' };
        }

        return {
          isSuccess: true,
          token: result.token,
          user: {
            id: result.id_usuario,
            username: result.usuario,
            email: result.correo,
            profileImage: result.url_foto_perfil
          }
        };
      } catch (error) {
        console.error('Error logging user:', error);
        return { isSuccess: false, message: error.message };
      }
    },
    async update(user, token) {
      const URL = BACKEND + "/api/Perfil/actualizarPerfil"
      const options = {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          usuario: user.username,
          correo: user.email,
          descripcion: user.description,
          urlFotoPerfil: null,
          urlFotoPortada: null,
          gustos: user.likes,
          noConsume: user.dislikes,
          alergico: user.alergic
        }),
      };

      try {
        const response = await fetch(URL, options);
        const result = await response.json();

        if (!response.ok) {
          console.error(`Update failed: ${result.message || 'Unknown error'}`);
          return { isSuccess: false, message: result.message || 'Update failed' };
        }

        return {
          isSuccess: true,
        };
      } catch (error) {
        console.error('Error updating user:', error);
        return { isSuccess: false, message: error.message };
      }
    },
  },
  recipes: {
    async uploadRecipe(recipe, token) {
      try {
        const response = await fetch(BACKEND + '/api/Recipe/Ingresar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            titulo: recipe.title,
            descripcion: recipe.description,
            instrucciones: recipe.instructions,
            foto_receta: "ipzum lorem",  // Valor fijo para la imagen
            usuario_id: recipe.userId,
          }),
        });

        const text = await response.text();

        const result = JSON.parse(text);
        if (response.ok) {
          return { isSuccess: true, data: result };
        } else {
          console.error('Upload recipe failed:', result);
          return { isSuccess: false };
        }
      } catch (error) {
        console.error('Error uploading recipe:', error);
        return { isSuccess: false };
      }
    },
    async uploadIngredient(ingredient, token) {
      try {
        const response = await fetch(BACKEND + '/api/Ingredientes/Ingresar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(ingredient),
        });

        const result = await response.json();
        if (response.ok) {
          return { isSuccess: true, data: result };
        } else {
          console.error('Upload ingredient failed:', result);
          return { isSuccess: false };
        }
      } catch (error) {
        console.error('Error uploading ingredient:', error);
        return { isSuccess: false };
      }
    },
    async relateIngredientsToRecipe(recipeId, ingredientIds, token) {
      try {
        const results = [];
        for (const ingredientId of ingredientIds) {
          const response = await fetch(BACKEND + '/api/RecetasIngredientes/Ingresar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              id_receta: recipeId,
              id_ingrediente: ingredientId,
            }),
          });

          const result = await response.text();
          if (response.ok) {
            try {
              results.push(JSON.parse(result));
            } catch (e) {
              console.error('Error parsing JSON response:', e);
              console.error('Response text:', result);
              return { isSuccess: false };
            }
          } else {
            console.error('Relate ingredient to recipe failed:', result);
            console.error('Response text:', result);
            return { isSuccess: false, data: results };
          }
        }
        console.log('Ingredients related to recipe:', results);
        return { isSuccess: true, data: results };
      } catch (error) {
        console.error('Error relating ingredients to recipe:', error);
        return { isSuccess: false };
      }
    },
  },
  ingredients: {
    async list(token) {
      const URL = BACKEND + "/api/Ingredientes/Listar"
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      };

      try {
        const response = await fetch(URL, options);
        const result = await response.json();

        if (!response.ok) {
          console.error(`List ingredients failed: ${result.message || 'Unknown error'}`);
          return { isSuccess: false, message: result.message || 'Search failed' };
        }

        return {
          isSuccess: true,
          ingredients: formatIngredients(result)
        };
      } catch (error) {
        console.error('Error searching ingredients:', error);
        return { isSuccess: false, message: error.message };
      }
    },
  }
};

function formatIngredients(array) {
  if (!array?.length) {
    return []
  }

  return array.map(i => ({ id: i.id_ingrediente, name: i.nombre }))
}

export default api;
